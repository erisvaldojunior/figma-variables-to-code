import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { codeToHtml } from 'shiki';
import '!./output.css';

function Plugin() {
  const [highlightedCode, setHighlightedCode] = useState('');

  useEffect(() => {
    // Function to highlight the Dart code using the updated Shiki API
    async function highlightCode(code: string) {
      const highlighted = await codeToHtml(code, { lang: 'dart', theme: 'nord' });
      setHighlightedCode(highlighted);
    }

    // Listen for messages from the parent (Figma) window
    onmessage = (event) => {
      const receivedDartCode = event.data.pluginMessage.dartFile;
      highlightCode(receivedDartCode); // Highlight and update the state with the received Dart code
    };
  }, []);

  return (
    <div class="p-4 bg-gray-900 text-white">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">figma_variables.dart</h2>
        <button
          class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
          onClick={() => {
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
          }}
        >
          Copy to Clipboard
        </button>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedCode }} // Render highlighted code
      ></pre>
    </div>
  );
}

export default render(Plugin);