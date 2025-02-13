import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import '!../css/output.css';

import GitHubModal from './GitHubModal';
import highlightCode from '../utils/highlightCode';
import copyToClipboard from '../utils/copyToClipboard';

function Plugin() {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [highlightedStylesCode, setHighlightedStylesCode] = useState('');
  const [highlightedStylesInternalCode, setHighlightedStylesInternalCode] = useState('');
  const [highlightedUtilsCode, setHighlightedUtilsCode] = useState('');
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [modesCodes, setModesCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    onmessage = (event) => {
      const receivedFiles = event.data.pluginMessage.files;

      if (receivedFiles.dartFile) {
        highlightCode(receivedFiles.dartFile, setHighlightedCode);
      }
      if (receivedFiles.stylesDartFile) {
        highlightCode(receivedFiles.stylesDartFile, setHighlightedStylesCode);
      }
      if (receivedFiles.stylesInternalDartFile) {
        highlightCode(receivedFiles.stylesInternalDartFile, setHighlightedStylesInternalCode);
      }
      if (receivedFiles.utilsDartFile) {
        highlightCode(receivedFiles.utilsDartFile, setHighlightedUtilsCode);
      }
      
      // Handle modes codes
      if (receivedFiles.modesCodes) {
        const newModesCodes: Record<string, string> = {};
        Object.entries(receivedFiles.modesCodes).forEach(([modeName, code]) => {
          highlightCode(code as string, (highlighted) => {
            newModesCodes[modeName] = highlighted;
          });
        });
        setModesCodes(newModesCodes);
      }
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
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      ></pre>

<div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_styles.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedStylesCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedStylesCode }}
      ></pre>

<div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_utils.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedUtilsCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedUtilsCode }}
      ></pre>

      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_styles_internal.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedStylesInternalCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedStylesInternalCode }}
      ></pre>

      {/* Render each mode's code block */}
      {Object.entries(modesCodes).map(([modeName, code]) => (
        <div key={modeName}>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">
              figma_variables_{modeName}.dart
            </h2>
            <div>
              <button
                class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
                onClick={() => copyToClipboard(code)}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
          <pre
            class="p-4 rounded"
            dangerouslySetInnerHTML={{ __html: code }}
          ></pre>
        </div>
      ))}

      {showGitHubModal && (
        <GitHubModal
          highlightedCode={highlightedCode}
          highlightedStylesCode={highlightedStylesCode}
          highlightedStylesInternalCode={highlightedStylesInternalCode}
          highlightedUtilsCode={highlightedUtilsCode}
          modesCodes={modesCodes}
          onClose={() => setShowGitHubModal(false)}
        />
      )}
    </div>
  );
}

export default render(Plugin);