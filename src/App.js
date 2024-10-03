import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import OpenAI from 'openai';
import { motion } from 'framer-motion';
import { Upload, FileText, Map } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

export default function MindMapApp() {
  const [pdfText, setPdfText] = useState('');
  const [mindMapMarkdown, setMindMapMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }, []);

  const extractTextFromPDF = async (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target.result);
      const pdf = await pdfjs.getDocument(typedArray).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      setPdfText(text);
    };
    reader.readAsArrayBuffer(file);
  };

  const generateMindMap = async () => {
    setLoading(true);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that creates mind maps in Markdown format." },
          { role: "user", content: `Create a mind map in Markdown format based on the following text: ${pdfText}` }
        ],
      });
      setMindMapMarkdown(response.choices[0].message.content);
    } catch (error) {
      console.error("Error generating mind map:", error);
    }
    setLoading(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      extractTextFromPDF(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-2xl p-8 max-w-4xl w-full"
      >
        <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">PDF to Mind Map</h1>
        <div className="mb-8">
          <label htmlFor="file-upload" className="flex flex-col items-center px-4 py-6 bg-purple-50 text-purple-600 rounded-lg shadow-lg tracking-wide uppercase border border-purple-300 cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition duration-300 ease-in-out">
            <Upload size={64} />
            <span className="mt-2 text-base leading-normal">Select a PDF file</span>
            <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
          </label>
          {fileName && (
            <p className="mt-2 text-sm text-gray-500 text-center">
              <FileText className="inline-block mr-1" size={16} />
              {fileName}
            </p>
          )}
        </div>
        {pdfText && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateMindMap}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <><Map className="mr-2" size={24} /> Generate Mind Map</>
            )}
          </motion.button>
        )}
        {mindMapMarkdown && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Generated Mind Map</h2>
            <div className="markmap border-2 border-purple-200 rounded-lg p-4 bg-purple-50 shadow-inner">
              <script type="text/template">
                {mindMapMarkdown}
              </script>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}