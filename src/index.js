import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Load markmap-autoloader after the React app is rendered
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/markmap-autoloader@latest';
script.async = true;
document.body.appendChild(script);