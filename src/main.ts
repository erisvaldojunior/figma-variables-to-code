import { showUI } from '@create-figma-plugin/utilities';
import { generateVariablesFile, generateVariablesModesFiles, generateVariablesInterfaceFile } from './utils/variablesGenerators';
import { generateStylesFile, generateStylesModesFiles, generateStylesInterfaceFile } from './utils/stylesGenerators';
import { generateUtilsFile } from './utils/utilsGenerators';
import { errorLogger } from './utils/errorLogger';

export default function () {
  showUI({
    height: 480,
    width: 800,
  });

  /* Clear previous error log */
  errorLogger.clear();

  /* Prepare variables for code generation */
  const variablesFile = generateVariablesFile();
  const variablesModesFiles = generateVariablesModesFiles();
  const variablesInterfaceFile = generateVariablesInterfaceFile();
  
  /* Prepare styles for code generation */
  const stylesFile = generateStylesFile();
  const stylesModesFiles = generateStylesModesFiles();
  const stylesInterfaceFile = generateStylesInterfaceFile();

  /* Prepare utils for code generation */
  const utilsFile = generateUtilsFile();
  
  /* Get error log */
  const errorLog = errorLogger.generateLogText();
  const errorCount = errorLogger.getErrorCount();
  
  /* Sends to the UI the code generation */
  figma.ui.postMessage({
    files: {
      variablesFile,
      variablesModesFiles,
      variablesInterfaceFile,
      stylesFile,
      stylesModesFiles,
      stylesInterfaceFile,
      utilsFile
    },
    errorLog,
    errorCount
  });

  /* Catches event when code copied to clipboard and notify the user */
  figma.ui.onmessage = (message) => {
    if (message.type === 'code-copied-dart') {
      figma.notify('Dart code successfully copied to clipboard');
    } else if (message.type === 'files-downloaded') {
      figma.notify('All Dart files successfully downloaded');
    } else if (message.type === 'download-error') {
      figma.notify('Error downloading files. Please try again.');
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
    filePath,
  });
}