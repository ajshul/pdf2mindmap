import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import OpenAI from 'openai';
import { motion } from 'framer-motion';
import { Upload, FileText, Map, Edit3 } from 'lucide-react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

export default function MindMapApp() {
  const [pdfText, setPdfText] = useState('');
  const [mindMapMarkdown, setMindMapMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const svgRef = useRef(null);
  const markmapRef = useRef(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    if (mindMapMarkdown && svgRef.current) {
      if (markmapRef.current) {
        markmapRef.current.destroy();
      }

      const transformer = new Transformer();
      const { root } = transformer.transform(mindMapMarkdown);

      const mm = Markmap.create(svgRef.current, {
        autoFit: true,
        color: (node) => {
          const level = node.state.depth;
          return ['#4285f4', '#34a853', '#fbbc05', '#ea4335'][level % 4];
        },
        duration: 500,
        maxWidth: 300,
        nodeMinHeight: 16,
        spacingHorizontal: 80,
        spacingVertical: 5,
        autoFit: true,
        fitRatio: 0.95,
      }, root);

      markmapRef.current = mm;

      const handleNodeClick = (node) => {
        if (editMode) {
          const newContent = prompt('Edit node:', node.content);
          if (newContent !== null && newContent.trim() !== '') {
            node.content = newContent;
            const newMarkdown = generateMarkdownFromTree(root);
            setMindMapMarkdown(newMarkdown);
          }
        }
      };

      mm.svg.selectAll('g[data-depth]').on('click', (event, d) => handleNodeClick(d.data));
    }
  }, [mindMapMarkdown, editMode]);

  const extractTextFromPDF = async (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target.result);
      try {
        const pdf = await pdfjs.getDocument(typedArray).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        setPdfText(text);
      } catch (error) {
        console.error("Error extracting text from PDF:", error);
        alert("Error extracting text from PDF. Please try again.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateMindMap = async () => {
    setLoading(true);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: `You will be creating a detailed and structured Markdown format mindmap based on the content of a PDF. This mindmap will be used with the markmap library to render a visual representation of the PDF's content. Your task is to analyze the provided PDF text and generate a hierarchical structure that captures the main ideas, subtopics, and important details.

Here is the text of the PDF:

<pdf_text>
${pdfText}
</pdf_text>

Follow these guidelines to create the mindmap:

1. Structure:
   - Start with the main topic or title of the PDF as the root node
   - Create major sections as first-level nodes
   - Break down each section into subtopics and key points
   - Use multiple levels of hierarchy to represent the depth of information

2. Formatting:
   - Use proper Markdown syntax for the mindmap
   - Each node should start with a hyphen (-) followed by a space
   - Use indentation (two spaces) to indicate hierarchy levels
   - Keep node text concise but informative

3. Content handling:
   - Identify and include key concepts, definitions, and important facts
   - Summarize lengthy paragraphs into brief, meaningful points
   - Include relevant examples, but keep them short
   - Capture relationships between ideas using the hierarchical structure

4. Balancing detail and conciseness:
   - Aim for nodes that are generally 3-10 words long
   - For complex ideas, use multiple shorter nodes instead of one long node
   - Ensure that the overall structure provides a comprehensive overview of the PDF content

5. Special elements:
   - If the PDF contains lists, tables, or figures, represent them in a logical hierarchy
   - For numerical data, include key figures but summarize trends rather than listing all numbers

Here's an example of how your output should be formatted:

<mindmap>
- Main Topic of the PDF
  - Major Section 1
    - Subtopic 1.1
      - Key point 1.1.1
      - Key point 1.1.2
    - Subtopic 1.2
      - Important fact
      - Brief example
  - Major Section 2
    - Definition of concept
    - Subtopic 2.1
      - Detail 2.1.1
      - Detail 2.1.2
    - Subtopic 2.2
  - Major Section 3
    - Key idea 3.1
    - Key idea 3.2
      - Supporting point
      - Supporting point
</mindmap>

Now, analyze the provided PDF text and create a detailed and structured Markdown format mindmap. Remember to maintain a balance between detail and conciseness, ensuring that each node provides valuable information while keeping the overall structure clear and easy to navigate.

Please wrap your markdown mindmap output within <mindmap> tags and provide nothing else.` },
        ],
      });

      const content = response.choices[0].message.content;
      
      // Extract content from <mindmap> tags
      const mindmapRegex = /<mindmap>([\s\S]*?)<\/mindmap>/;
      const match = content.match(mindmapRegex);
      if (match && match[1]) {
        setMindMapMarkdown(match[1].trim());
      } else {
        console.error("No <mindmap> tags found in the response");
        setMindMapMarkdown(content); // Fallback to using the entire content
      }
    } catch (error) {
      console.error("Error generating mind map:", error);
      alert("Error generating mind map. Please try again.");
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

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const generateMarkdownFromTree = (node, depth = 0) => {
    let markdown = '  '.repeat(depth) + '- ' + node.content + '\n';
    if (node.children) {
      for (const child of node.children) {
        markdown += generateMarkdownFromTree(child, depth + 1);
      }
    }
    return markdown;
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-lg p-8 max-w-4xl w-full"
      >
        <h1 className="text-4xl font-bold mb-6 text-center text-[#4285f4]">PDF to Mind Map</h1>
        <div className="mb-8">
          <label htmlFor="file-upload" className="flex flex-col items-center px-4 py-6 bg-[#e8f0fe] text-[#4285f4] rounded-lg shadow-md tracking-wide uppercase border border-[#4285f4] cursor-pointer hover:bg-[#d2e3fc] transition duration-300 ease-in-out">
            <Upload size={64} />
            <span className="mt-2 text-base leading-normal">Select a PDF file</span>
            <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
          </label>
          {fileName && (
            <p className="mt-2 text-sm text-[#5f6368] text-center">
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
            className="w-full bg-[#4285f4] text-white font-bold py-3 px-6 rounded-lg shadow-md flex items-center justify-center hover:bg-[#3367d6] transition duration-300 ease-in-out"
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
            <h2 className="text-2xl font-bold mb-4 text-[#4285f4]">Generated Mind Map</h2>
            <div className="border-2 border-[#4285f4] rounded-lg p-4 bg-[#e8f0fe] shadow-inner" style={{ height: '600px', overflow: 'hidden' }}>
              <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleEditMode}
              className="mt-4 w-full bg-[#4285f4] text-white font-bold py-3 px-6 rounded-lg shadow-md flex items-center justify-center hover:bg-[#3367d6] transition duration-300 ease-in-out"
            >
              {editMode ? (
                <><Edit3 className="mr-2" size={24} /> Exit Edit Mode</>
              ) : (
                <><Edit3 className="mr-2" size={24} /> Enter Edit Mode</>
              )}
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}