import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import '!../css/output.css';

import GitHubModal from './GitHubModal';
import highlightCode from '../utils/highlightCode';
import copyToClipboard from '../utils/copyToClipboard';

function Plugin() {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  useEffect(() => {
    onmessage = (event) => {
      const receivedDartCode = event.data.pluginMessage.dartFile;
      highlightCode(receivedDartCode, setHighlightedCode); // Highlight and update the state with the received Dart code
    };
  }, []);

  return (
    <div class="p-4 bg-gray-900 text-white">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">figma_variables.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedCode)}
          >
            Copy to Clipboard
          </button>
          <button
            class="ml-2 px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => setShowGitHubModal(true)}
          >
            Sync with GitHub
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedCode }} // Render highlighted code
      ></pre>

      {showGitHubModal && <GitHubModal onClose={() => setShowGitHubModal(false)} highlightedCode={highlightedCode} />}
    </div>
  );
}

export default render(Plugin);