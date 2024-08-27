import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

type GitHubModalProps = {
  onClose: () => void;
  highlightedCode: string;
};

type CommitBody = {
  message: string;
  content: string;
  branch: string;
  sha?: string;
}

export default function GitHubModal({ onClose, highlightedCode }: GitHubModalProps) {
  const [usernameField, setUsernameField] = useState('');
  const [tokenField, setTokenField] = useState('');
  const [repositoryField, setRepositoryField] = useState('');
  const [branchField, setBranchField] = useState('main');
  const [filePathField, setFilePathField] = useState('src/design-tokens/figma_variables.dart');

  useEffect(() => {
    window.onmessage = (event) => {
      const { data } = event;
      if (data.pluginMessage) {
        if (data.pluginMessage.type === 'settingsLoaded') {
          setUsernameField(data.pluginMessage.username || '');
          setTokenField(data.pluginMessage.token || '');
          setRepositoryField(data.pluginMessage.repo || '');
          setBranchField(data.pluginMessage.branch || 'main');
          setFilePathField(data.pluginMessage.filePath || 'src/design-tokens/figma_variables.dart');
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
  
    const commitUrl = `https://api.github.com/repos/${usernameField}/${repositoryField}/contents/${filePathField}`;
    
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
    const doc = parser.parseFromString(highlightedCode, 'text/html');
    const plainCode = doc.body.textContent || '';
      
    const commitBody: CommitBody = {
      message: `Update ${filePathField} from Figma Variables`,
      content: btoa(plainCode),
      branch: newBranch,
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
      alert('Failed to commit code.');
      return;
    }
  
    // Create a pull request
    const pullRequestUrl = `https://api.github.com/repos/${usernameField}/${repositoryField}/pulls`;
  
    const pullRequestResponse = await fetch(pullRequestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${tokenField}`,
      },
      body: JSON.stringify({
        title: `chore: Update ${filePathField}`,
        head: newBranch,
        base: branchField,
        body: `This pull request updates ${filePathField} with the latest updates from Figma Variables.\n\nCreated automatically by figma-variables-to-code plugin.`,
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
          filePath: filePathField
        }
      }, '*');
    } else {
      const errorText = await pullRequestResponse.text();
      alert(`Failed to create pull request: ${errorText}`);
    }
  };
    
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
          <label class="block mb-2">Default Branch</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={branchField}
            onChange={(e) => setBranchField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">File Path</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={filePathField}
            onChange={(e) => setFilePathField((e.target as HTMLInputElement).value)}
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