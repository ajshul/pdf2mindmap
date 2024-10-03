export function generateMarkdownFromTree(node) {
    let markdown = '';
  
    function traverse(currentNode, depth) {
      if (!currentNode) return;
  
      const indent = '  '.repeat(depth);
      markdown += `${indent}- ${currentNode.content}\n`;
  
      if (currentNode.children) {
        currentNode.children.forEach(child => traverse(child, depth + 1));
      }
    }
  
    traverse(node, 0);
    return markdown;
  }
  