import { showUI } from '@create-figma-plugin/utilities'
import { generateDartCode } from './utils/generators';

export default function () {
  showUI({
    height: 480,
    width: 800
  });
  /* Prepare variables for code generation */
  const dartFile = generateDartCode();
  /* Sends to the UI the code generation */
  figma.ui.postMessage({ dartFile });
  /* Catches event when code copied to clipboard and notify the user */
  figma.ui.onmessage = (message) => {
	if (message.type === 'code-copied-dart') {
		figma.notify('Dart code successfully copied to clipboard');
	}
  };
}
