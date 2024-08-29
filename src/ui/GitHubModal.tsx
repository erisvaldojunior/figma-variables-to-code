import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

type GitHubModalProps = {
  onClose: () => void;
  highlightedCode: string;
  highlightedInternalCode: string;
  highlightedStylesCode: string;
  highlightedStylesInternalCode: string;
  highlightedUtilsCode: string;
};

type CommitBody = {
  message: string;
  content: string;
  branch: string;
  sha?: string;
};

export default function GitHubModal({
  onClose,
  highlightedCode,
  highlightedInternalCode,
  highlightedStylesCode,
  highlightedStylesInternalCode,
  highlightedUtilsCode
}: GitHubModalProps) {
  const [usernameField, setUsernameField] = useState('');
  const [tokenField, setTokenField] = useState('');
  const [repositoryField, setRepositoryField] = useState('');
  const [branchField, setBranchField] = useState('main');
  const [folderPathField, setFolderPathField] = useState('lib/design-tokens/');

  useEffect(() => {
    window.onmessage = (event) => {
      const { data } = event;
      if (data.pluginMessage) {
        if (data.pluginMessage.type === 'settingsLoaded') {
          setUsernameField(data.pluginMessage.username || '');
          setTokenField(data.pluginMessage.token || '');
          setRepositoryField(data.pluginMessage.repo || '');
          setBranchField(data.pluginMessage.branch || 'main');
          setFolderPathField(data.pluginMessage.folderPath || 'lib/design-tokens/');
        }
      }
    };
    parent.postMessage({ pluginMessage: { type: 'loadSettings' } }, '*');
  }, []);

  const onPressSendToProvider = async () => {
    const newBranch = `chore/figma-variables-${Date.now()}`;

    const createBranchUrl = `https://api.github.com/repos/${usernameField}/${repositoryField}/git/refs`;
    const mainBranch = `refs/heads/${branchField}`;
    const newBranchRef = `refs/heads/${newBranch}`;

    // Create a new branch
    const branchResponse = await fetch(createBranchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${tokenField}`,
      },
      body: JSON.stringify({
        ref: newBranchRef,
        sha: await getLatestCommitSha(usernameField, repositoryField, mainBranch, tokenField),
      }),
    });

    if (!branchResponse.ok) {
      alert('Failed to create new branch.');
      return;
    }

    // Paths for variable files
    const internalFilePath = `${folderPathField}figma_variables_internal.dart`;
    const interfaceFilePath = `${folderPathField}figma_variables.dart`;

    // Paths for style files
    const internalStylesFilePath = `${folderPathField}figma_styles_internal.dart`;
    const interfaceStylesFilePath = `${folderPathField}figma_styles.dart`;

    // Path for utils file
    const utilsFilePath = `${folderPathField}figma_utils.dart`;

    // Commit the figma_utils.dart file
    const commitResultUtils = await commitFileToGitHub(utilsFilePath, highlightedUtilsCode, newBranch);
    if (!commitResultUtils) return;

    // Commit the figma_variables_internal.dart file
    const commitResultInternal = await commitFileToGitHub(internalFilePath, highlightedInternalCode, newBranch);
    if (!commitResultInternal) return;

    // Commit the figma_variables.dart file
    const commitResultExternal = await commitFileToGitHub(interfaceFilePath, highlightedCode, newBranch);
    if (!commitResultExternal) return;

    // Commit the figma_styles_internal.dart file
    const commitResultInternalStyles = await commitFileToGitHub(internalStylesFilePath, highlightedStylesInternalCode, newBranch);
    if (!commitResultInternalStyles) return;

    // Commit the figma_styles.dart file
    const commitResultExternalStyles = await commitFileToGitHub(interfaceStylesFilePath, highlightedStylesCode, newBranch);
    if (!commitResultExternalStyles) return;

    // Create a pull request
    const pullRequestUrl = `https://api.github.com/repos/${usernameField}/${repositoryField}/pulls`;

    const pullRequestResponse = await fetch(pullRequestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${tokenField}`,
      },
      body: JSON.stringify({
        title: `chore: Update Figma Variables and Styles`,
        head: newBranch,
        base: branchField,
        body: `This pull request updates the following files with the latest updates from Figma Variables and Styles:\n\n- figma_variables.dart\n- figma_variables_internal.dart\n- figma_styles.dart\n- figma_styles_internal.dart\n- figma_utils.dart\n\nCreated automatically by figma-variables-to-code plugin.`,
      }),
    });

    if (pullRequestResponse.ok) {
      alert('Pull request created successfully!');

      // Save settings after successful pull request creation
      parent.postMessage({
        pluginMessage: {
          type: 'saveSettings',
          username: usernameField,
          token: tokenField,
          repo: repositoryField,
          branch: branchField,
          folderPath: folderPathField,
        },
      }, '*');
    } else {
      const errorText = await pullRequestResponse.text();
      alert(`Failed to create pull request: ${errorText}`);
    }
  };

  async function commitFileToGitHub(filePath: string, code: string, branch: string): Promise<boolean> {
    const commitUrl = `https://api.github.com/repos/${usernameField}/${repositoryField}/contents/${filePath}`;

    // Check if the file already exists and retrieve its sha if it does
    let existingFileSha = '';
    const fileResponse = await fetch(commitUrl, {
      headers: {
        Authorization: `token ${tokenField}`,
      },
    });

    if (fileResponse.ok) {
      const fileData = await fileResponse.json();
      existingFileSha = fileData.sha;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'text/html');
    const plainCode = doc.body.textContent || '';

    const commitBody: CommitBody = {
      message: `Update ${filePath} from Figma Variables and Styles`,
      content: btoa(plainCode),
      branch: branch,
    };

    // Include sha in the commit if the file already exists
    if (existingFileSha) {
      commitBody['sha'] = existingFileSha;
    }

    // Commit the code
    const commitResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${tokenField}`,
      },
      body: JSON.stringify(commitBody),
    });

    if (!commitResponse.ok) {
      alert(`Failed to commit code to ${filePath}.`);
      return false;
    }
    return true;
  }

  async function getLatestCommitSha(user: string, repo: string, branchRef: string, token: string): Promise<string> {
    const url = `https://api.github.com/repos/${user}/${repo}/git/refs/heads/${branchRef.replace('refs/heads/', '')}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    const data = await response.json();
    return data.object.sha;
  }

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div class="bg-gray-800 p-6 rounded-lg w-96">
        <h2 class="text-lg font-semibold mb-4">Sync with GitHub</h2>
        <div class="mb-4">
          <label class="block mb-2">Username / Organization</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={usernameField}
            onChange={(e) => setUsernameField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Personal Access Token</label>
          <input
            type="password"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={tokenField}
            onChange={(e) => setTokenField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Repository Name</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={repositoryField}
            onChange={(e) => setRepositoryField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Folder Path</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={folderPathField}
            onChange={(e) => setFolderPathField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="flex justify-end">
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => {
              onPressSendToProvider();
              onClose();
            }}
          >
            Submit
          </button>
          <button
            class="ml-2 px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}