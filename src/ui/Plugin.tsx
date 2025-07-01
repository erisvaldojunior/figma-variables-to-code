import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import '!../css/output.css';
const JSZip = require('jszip');

import GitHubModal from './GitHubModal';
import highlightCode from '../utils/highlightCode';
import copyToClipboard from '../utils/copyToClipboard';

function Plugin() {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [highlightedStylesCode, setHighlightedStylesCode] = useState('');
  const [highlightedUtilsCode, setHighlightedUtilsCode] = useState('');
  const [highlightedStylesInterfaceCode, setHighlightedStylesInterfaceCode] = useState('');
  const [highlightedVariablesInterfaceCode, setHighlightedVariablesInterfaceCode] = useState('');
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [stylesModesCodes, setStylesModesCodes] = useState<Record<string, string>>({});
  const [variablesModesCodes, setVariablesModesCodes] = useState<Record<string, string>>({});
  const [errorLog, setErrorLog] = useState('');
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    onmessage = (event) => {
      const { files: receivedFiles, errorLog, errorCount } = event.data.pluginMessage;

      // Set error log data
      if (errorLog) setErrorLog(errorLog);
      if (typeof errorCount === 'number') setErrorCount(errorCount);

      if (receivedFiles.variablesFile) {
        highlightCode(receivedFiles.variablesFile, setHighlightedCode);
      }
      if (receivedFiles.stylesFile) {
        highlightCode(receivedFiles.stylesFile, setHighlightedStylesCode);
      }
      if (receivedFiles.utilsFile) {
        highlightCode(receivedFiles.utilsFile, setHighlightedUtilsCode);
      }
      if (receivedFiles.stylesInterfaceFile) {
        highlightCode(receivedFiles.stylesInterfaceFile, setHighlightedStylesInterfaceCode);
      }
      if (receivedFiles.variablesInterfaceFile) {
        highlightCode(receivedFiles.variablesInterfaceFile, setHighlightedVariablesInterfaceCode);
      }
      
      // Handle variables modes files
      if (receivedFiles.variablesModesFiles) {
        const newModesCodes: Record<string, string> = {};
        for (const modeName in receivedFiles.variablesModesFiles) {
          if (receivedFiles.variablesModesFiles.hasOwnProperty(modeName)) {
            const code = receivedFiles.variablesModesFiles[modeName];
            highlightCode(code as string, (highlighted) => {
              newModesCodes[modeName] = highlighted;
            });
          }
        }
        setVariablesModesCodes(newModesCodes);
      }

      // Handle styles modes files
      if (receivedFiles.stylesModesFiles) {
        const newModesCodes: Record<string, string> = {};
        for (const modeName in receivedFiles.stylesModesFiles) {
          if (receivedFiles.stylesModesFiles.hasOwnProperty(modeName)) {
            const code = receivedFiles.stylesModesFiles[modeName];
            highlightCode(code as string, (highlighted) => {
              newModesCodes[modeName] = highlighted;
            });
          }
        }
        setStylesModesCodes(newModesCodes);
      }
    };
  }, []);

  const downloadAllFiles = async () => {
    const parser = new DOMParser();
    
    // Helper function to extract plain text from highlighted code
    const extractPlainText = (highlightedCode: string): string => {
      const doc = parser.parseFromString(highlightedCode, 'text/html');
      return doc.body.textContent || '';
    };

    try {
      // Create a new JSZip instance
      const zip = new JSZip();

      // Add all main files to ZIP
      if (highlightedVariablesInterfaceCode) {
        zip.file('figma_variables_interface.dart', extractPlainText(highlightedVariablesInterfaceCode));
      }
      
      if (highlightedCode) {
        zip.file('figma_variables.dart', extractPlainText(highlightedCode));
      }
      
      if (highlightedStylesInterfaceCode) {
        zip.file('figma_styles_interface.dart', extractPlainText(highlightedStylesInterfaceCode));
      }
      
      if (highlightedStylesCode) {
        zip.file('figma_styles.dart', extractPlainText(highlightedStylesCode));
      }
      
      if (highlightedUtilsCode) {
        zip.file('figma_utils.dart', extractPlainText(highlightedUtilsCode));
      }

      // Add variables mode files to ZIP
      for (const modeName in variablesModesCodes) {
        if (variablesModesCodes.hasOwnProperty(modeName)) {
          const code = variablesModesCodes[modeName];
          if (code) {
            zip.file(`figma_variables_${modeName}.dart`, extractPlainText(code));
          }
        }
      }

      // Add styles mode files to ZIP
      for (const modeName in stylesModesCodes) {
        if (stylesModesCodes.hasOwnProperty(modeName)) {
          const code = stylesModesCodes[modeName];
          if (code) {
            zip.file(`figma_styles_${modeName}.dart`, extractPlainText(code));
          }
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download the ZIP file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'figma-dart-files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show notification
      parent.postMessage({ pluginMessage: { type: 'files-downloaded' } }, '*');
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      // Fallback notification
      parent.postMessage({ pluginMessage: { type: 'download-error' } }, '*');
    }
  };

  return (
    <div class="p-4 bg-gray-900 text-white">
      <div class="flex justify-center mb-4">
        <button
          class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black ml-2"
          onClick={downloadAllFiles}
        >
          Download ZIP File
        </button>
        <button
          class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black ml-2"
          onClick={() => setShowGitHubModal(true)}
        >
          Sync with GitHub
        </button>
      </div>

      {/* Error Log Section */}
      {errorCount > 0 && (
        <div class="mb-8 p-4 bg-gray-800 rounded">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-lg font-semibold text-orange-400">
              Generation Issues ({errorCount})
            </h2>
            <button
              class="px-4 py-1 text-sm bg-gray-700 rounded hover:bg-white hover:text-black"
              onClick={() => {
                const blob = new Blob([errorLog], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'figma-variables-generation-log.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Log
            </button>
          </div>
          <pre class="text-sm bg-gray-900 p-2 rounded text-wrap overflow-auto max-h-32">
            {errorLog}
          </pre>
        </div>
      )}

      {/* Variables Interface */}
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_variables_interface.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedVariablesInterfaceCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedVariablesInterfaceCode }}
      ></pre>

      {/* Variables */}
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

      {/* Styles Interface */}
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_styles_interface.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedStylesInterfaceCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedStylesInterfaceCode }}
      ></pre>

      {/* Styles */}
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

      {/* Utils */}
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

      {/* Render each variable mode code block */}
      {(() => {
        const variableModeBlocks = [];
        for (const modeName in variablesModesCodes) {
          if (variablesModesCodes.hasOwnProperty(modeName)) {
            const code = variablesModesCodes[modeName];
            variableModeBlocks.push(
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
            );
          }
        }
        return variableModeBlocks;
      })()}

      {/* Render each style mode code block */}
      {(() => {
        const styleModeBlocks = [];
        for (const modeName in stylesModesCodes) {
          if (stylesModesCodes.hasOwnProperty(modeName)) {
            const code = stylesModesCodes[modeName];
            styleModeBlocks.push(
              <div key={modeName}>
                <div class="flex justify-between items-center">
                  <h2 class="text-lg font-semibold">
                    figma_styles_{modeName}.dart
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
            );
          }
        }
        return styleModeBlocks;
      })()}

      {showGitHubModal && (
        <GitHubModal
          highlightedCode={highlightedCode}
          highlightedStylesCode={highlightedStylesCode}
          highlightedUtilsCode={highlightedUtilsCode}
          highlightedStylesInterfaceCode={highlightedStylesInterfaceCode}
          highlightedVariablesInterfaceCode={highlightedVariablesInterfaceCode}
          stylesModesCodes={stylesModesCodes}
          variablesModesCodes={variablesModesCodes}
          onClose={() => setShowGitHubModal(false)}
        />
      )}
    </div>
  );
}

export default render(Plugin);