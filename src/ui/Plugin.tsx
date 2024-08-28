import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import '!../css/output.css';

import GitHubModal from './GitHubModal';
import highlightCode from '../utils/highlightCode';
import copyToClipboard from '../utils/copyToClipboard';

function Plugin() {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [highlightedInternalCode, setHighlightedInternalCode] = useState('');
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  useEffect(() => {
    onmessage = (event) => {
      const receivedFiles = event.data.pluginMessage.files;
      highlightCode(receivedFiles.dartFile, setHighlightedCode); // Highlight and update the state with the received Dart code
      highlightCode(receivedFiles.dartInternalFile, setHighlightedInternalCode); // Highlight and update the state with the received Dart code
    };
  }, []);

  return (
    <div class="p-4 bg-gray-900 text-white">
      <div class="flex justify-center">
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => setShowGitHubModal(true)}
          >
            Sync with GitHub
          </button>
          </div>
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_variables.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedCode }} // Render highlighted code
      ></pre>

<div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_variables_internal.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedInternalCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedInternalCode }} // Render highlighted code
      ></pre>

      {showGitHubModal && <GitHubModal onClose={() => setShowGitHubModal(false)} highlightedCode={highlightedCode} highlightedInternalCode={highlightedInternalCode} />}
    </div>
  );
}

export default render(Plugin);