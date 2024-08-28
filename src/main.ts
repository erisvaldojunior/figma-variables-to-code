import { showUI } from '@create-figma-plugin/utilities'
import { generateDartCode, generateInternalDartCode } from './utils/generators';

export default function () {
  showUI({
    height: 480,
    width: 800
  });
  /* Prepare variables for code generation */
  const dartFile = generateDartCode();
  const dartInternalFile = generateInternalDartCode();
  /* Sends to the UI the code generation */
  figma.ui.postMessage({ files: {
    dartFile,
    dartInternalFile
  } });
  /* Catches event when code copied to clipboard and notify the user */
  figma.ui.onmessage = (message) => {
  	if (message.type === 'code-copied-dart') {
	  	figma.notify('Dart code successfully copied to clipboard');
	  } else if (message.type === 'saveSettings') {
      // Save settings to clientStorage
      figma.clientStorage.setAsync('githubUsername', message.username);
      figma.clientStorage.setAsync('githubToken', message.token);
      figma.clientStorage.setAsync('githubRepo', message.repo);
      figma.clientStorage.setAsync('githubBranch', message.branch);
      figma.clientStorage.setAsync('githubFilePath', message.filePath);
    } else if (message.type === 'loadSettings') {
      // Load settings from clientStorage
      loadSettings();
    }
  };
}

async function loadSettings() {
  const username = await figma.clientStorage.getAsync('githubUsername');
  const token = await figma.clientStorage.getAsync('githubToken');
  const repo = await figma.clientStorage.getAsync('githubRepo');
  const branch = await figma.clientStorage.getAsync('githubBranch');
  const filePath = await figma.clientStorage.getAsync('githubFilePath');
  figma.ui.postMessage({
    type: 'settingsLoaded',
    username,
    token,
    repo,
    branch,
    filePath
  });

}