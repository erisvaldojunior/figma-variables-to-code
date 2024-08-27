// Function to copy highlighted code to the clipboard
export default function copyToClipboard(highlightedCode: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(highlightedCode, 'text/html');
    const plainCode = doc.body.textContent || '';
    
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = plainCode;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);
    
    parent.postMessage(
      { eventName: 'code-copied-dart', pluginMessage: { type: 'code-copied-dart' } },
      '*'
    );
  }