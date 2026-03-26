import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import wwebjs from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = wwebjs;

dotenv.config();

const app = express();
app.use(cors());
// Force 50mb limit at the top of the middleware stack before anything else parses it
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// GEMINI API UTILITY
// ==========================================
async function analyzeWithGemini(jobDesc, resumePayload, providedKey) {
    let genApiKey = process.env.GEMINI_API_KEY;
    
    if (providedKey && providedKey.trim().length > 10) {
        if (providedKey.includes('AIza')) {
            const match = providedKey.match(/(AIza[a-zA-Z0-9_\-]+)/);
            if (match) genApiKey = match[1];
        } else {
            genApiKey = providedKey.trim();
        }
    }
    
    if (!genApiKey) throw new Error("No Gemini API key provided. Please pass a valid API key in the UI or check your .env file.");

    const genAI = new GoogleGenerativeAI(genApiKey);
    
    // Natively enforce strict structural generation
    const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
            score: { type: SchemaType.STRING, description: "Markdown text for Match Score out of 10 and detailed feedback" },
            markdown_resume: { type: SchemaType.STRING, description: "Fully ATS-optimized rewritten resume in markdown format" },
            basics: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, email: { type: SchemaType.STRING }, phone: { type: SchemaType.STRING }, location: { type: SchemaType.STRING } }, required: ["name", "email", "phone", "location"] },
            skills: { type: SchemaType.OBJECT, properties: { frontend: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, backend: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, databases: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, tools: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } },
            projects: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, technologies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, startDate: { type: SchemaType.STRING }, endDate: { type: SchemaType.STRING }, highlights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } } },
            education: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { institution: { type: SchemaType.STRING }, area: { type: SchemaType.STRING }, studyType: { type: SchemaType.STRING }, startDate: { type: SchemaType.STRING }, score: { type: SchemaType.STRING } } } },
            achievements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["score", "markdown_resume", "basics", "skills", "projects", "education", "achievements"]
    };

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000,
            responseMimeType: "application/json",
            responseSchema
        }
    });

    const systemPrompt = `You are an AI Resume Optimization Assistant. Analyze the candidate's incoming resume (which might be raw text or a PDF attachment) against the target job description. Output exactly ONE valid JSON object populated with ATS-optimized data. Ensure all text content generated uses professional, high-impact ATS verbs perfectly tailored to the job description. Do NOT leave critical fields like Name empty; rigorously extract it from the resume file.`;

    const promptParts = [{ text: systemPrompt + "\n\nJOB DESCRIPTION:\n" + jobDesc + "\n\nCANDIDATE RESUME:" }];
    
    // Determine if the resume payload is a Base64 PDF or raw text
    if (resumePayload && resumePayload.type === 'pdf') {
        promptParts.push({ inlineData: { data: resumePayload.data, mimeType: "application/pdf" } });
    } else {
        const fallbackText = resumePayload?.data ? resumePayload.data : resumePayload;
        promptParts.push({ text: "\n" + fallbackText });
    }

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: promptParts }]
        });

        const textResponse = result.response.text();
        
        let parsedData = {};
        try { 
            parsedData = JSON.parse(textResponse); 
        } catch (e) {
            console.error("Native JSON Parse Error:", e.message);
        }

        if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
            parsedData = {};
        }

        const scorePart = parsedData.score || "Analysis pending.";
        const resumePart = parsedData.markdown_resume || "Resume format generation skipped.";

        // Guarantee skeleton so the frontend Canva templates NEVER throw an undefined error
        if (!parsedData.basics) parsedData.basics = { name: "Optimized Candidate", email: "No Email Provided", phone: "", location: "" };
        if (!parsedData.skills) parsedData.skills = { frontend: [], backend: [], databases: [], tools: [] };
        if (!parsedData.projects) parsedData.projects = [];
        if (!parsedData.education) parsedData.education = [];
        if (!parsedData.achievements) parsedData.achievements = [];

        return { score: scorePart, resume: resumePart, data: parsedData, rawJson: textResponse };
    } catch (apiError) {
        if (apiError.message && apiError.message.includes('API key not valid')) {
            throw new Error("API key not valid. Please pass a valid Gemini API key.");
        }
        throw apiError;
    }
}

// ==========================================
// EXPRESS REST API
// ==========================================
// Body size limits are configured at the top of the file

app.post('/api/analyze', async (req, res) => {
    try {
        const { jobDesc, resumePayload, apiKey } = req.body;
        if (!jobDesc || !resumePayload) return res.status(400).json({ error: "Job Description and Resume payload are required." });
        
        const output = await analyzeWithGemini(jobDesc, resumePayload, apiKey);
        res.status(200).json(output);
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message || "An error occurred." });
    }
});

// START EXPRESS SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\nExpress API Server running on port ${PORT}`);
});

// ==========================================
// WHATSAPP BOT INTEGRATION (PHYSICAL PHONE)
// ==========================================
const activeSessions = new Map();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log("\n==============================================");
    console.log("==> PLEASE SCAN THIS QR CODE WITH WHATSAPP <==");
    console.log("==============================================\n");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log("✅ WhatsApp Physical Phone Bot is Ready & Authenticated!");
});

// Use message_create so it natively picks up messages sent to YOURSELF
client.on('message_create', async (msg) => {
    const senderId = msg.from;
    const userText = msg.body;
    
    // Prevent the bot from talking to itself natively by blocking its own output patterns
    const botPatterns = ['👋', '✅', '⏳', '📊', '✨', '⚠️'];
    if (botPatterns.some(p => userText.startsWith(p))) return;
    
    // Check state machine
    let session = activeSessions.get(senderId);
    if (!session) {
        if (['hello', 'start', 'hi'].includes(userText.toLowerCase())) {
            msg.reply("👋 *AI Resume Optimizer Bot*\n\nPlease paste the **Job Description** you are targeting.");
            activeSessions.set(senderId, { step: 1 });
        }
        return;
    }

    if (session.step === 1) {
        activeSessions.set(senderId, { step: 2, jobDesc: userText });
        msg.reply("✅ Job Description saved!\n\nNow, please paste your **Resume** or upload it directly as a **PDF/TXT attachment**.");
    } 
    else if (session.step === 2) {
        activeSessions.set(senderId, { step: 3, jobDesc: session.jobDesc }); // lock state
        msg.reply("⏳ *Analyzing your resume... This might take up to 20 seconds.*");
        
        try {
            let resumePayload = { type: 'text', data: userText };
            
            // Handle Native PDF File Uploads securely from the phone chat!
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media && (media.mimetype === 'application/pdf' || media.mimetype.includes('text'))) {
                    resumePayload = { 
                        type: media.mimetype === 'application/pdf' ? 'pdf' : 'text', 
                        data: media.data, 
                        name: media.filename || 'resume' 
                    };
                }
            }
            
            // Execute the schema generation
            const output = await analyzeWithGemini(session.jobDesc, resumePayload);
            
            let replyText = `📊 *Match Score & Feedback:*\n${output.score}\n\n`;
            replyText += `✨ *ATS-Optimized Resume:*\n${output.resume}`;
            
            await msg.reply(replyText);
            
        } catch (e) {
            console.error("WhatsApp Flow Error:", e);
            await msg.reply("⚠️ Error analyzing your resume. Ensure your API Key is correct.");
        }
        activeSessions.delete(senderId);
    }
});

client.initialize();
