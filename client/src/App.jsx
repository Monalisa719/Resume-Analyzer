import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import TemplateViewer from './Templates';
import './index.css';

function App() {
  // Conversational state
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: '🚀 *Welcome to the AI Resume Optimizer Bot!*\n\nPlease paste the **Job Description** you want to analyze against.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [jobDesc, setJobDesc] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (step === 2) {
      const reader = new FileReader();

      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: `*[Uploaded File: ${file.name}]*` }]);

      if (file.type === 'application/pdf') {
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          executeAnalysis(jobDesc, { type: 'pdf', data: base64, name: file.name });
        };
      } else {
        reader.readAsText(file);
        reader.onload = () => {
          executeAnalysis(jobDesc, { type: 'text', data: reader.result, name: file.name });
        };
      }
    } else {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '⚠️ Please provide the **Job Description** first before uploading a resume!' }]);
    }
  };

  const executeAnalysis = async (jd, resumePayload) => {
    setLoading(true);
    setStep(3);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `⏳ *Analyzing ${resumePayload.name}... This will take a few seconds.*` }]);

    try {
      const response = await axios.post('http://localhost:5000/api/analyze', {
        jobDesc: jd,
        resumePayload
      });

      const data = response.data;

      setMessages(prev => [
        ...prev,
        { id: Date.now(), sender: 'bot', text: '📊 **Match Score & Feedback:**\n\n' + data.score },
        { id: Date.now() + 1, sender: 'bot', type: 'templates', jsonData: data.data }
      ]);

      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'bot', text: 'Would you like to analyze another resume? Just paste a new **Job Description** to start over!' }]);
        setStep(1);
      }, 1500);

    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '⚠️ **Error:** ' + (err.response?.data?.error || err.message) + '\n\nPlease refresh the page.' }]);
      setStep(1);
    } finally {
      setLoading(false);
      // clear the file input just in case
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputVal.trim() || loading) return;

    const userText = inputVal.trim();
    setInputVal('');

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userText }]);

    if (step === 1) {
      setJobDesc(userText);
      setStep(2);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '✅ **Job Description saved!**\n\nLastly, please paste the candidate\'s full **Resume**, or **click the 📎 icon** below to upload a PDF or TXT file.' }]);
      }, 500);
    }
    else if (step === 2) {
      executeAnalysis(jobDesc, { type: 'text', data: userText, name: "Text Input" });
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="chat-header-info">
          <div className="avatar">🤖</div>
          <div>
            <h2>Resume Optimizer Bot</h2>
            <p className="online-status">Online</p>
          </div>
        </div>
      </header>

      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
            <div className="message-bubble" style={msg.type === 'templates' ? { maxWidth: '100%', background: 'transparent', boxShadow: 'none' } : {}}>
              {msg.type === 'templates' ? (
                <TemplateViewer jsonData={msg.jsonData} />
              ) : (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-wrapper bot">
            <div className="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="file"
          id="file-upload"
          accept=".pdf,.txt"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          disabled={loading}
        />
        <label htmlFor="file-upload" className="file-upload-btn" title="Upload Resume PDF/TXT" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
          📎
        </label>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          autoComplete="off"
        />
        <button type="submit" disabled={!inputVal.trim() || loading}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default App;
