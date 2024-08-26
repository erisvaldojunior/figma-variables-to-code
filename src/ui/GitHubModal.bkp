import { h } from 'preact';
import { useState } from 'preact/hooks';

type GitHubModalProps = {
  onClose: () => void;
  highlightedCode: string;
};

export default function GitHubModal({ onClose, highlightedCode }: GitHubModalProps) {
  const [usernameField, setUsernameField] = useState('');
  const [tokenField, setTokenField] = useState('');
  const [repositoryField, setRepositoryField] = useState('');
  const [branchField, setBranchField] = useState('main');
  const [filePathField, setFilePathField] = useState('src/design-tokens/figma_variables.dart');

  const onPressSendToProvider = async () => {
    const branch = branchField;
    const filePath = filePathField;
    const user = usernameField;
    const repo = repositoryField;
    const token = tokenField;

    const newBranch = `figma-variables-${Date.now()}`;

    // Create a new branch from the default branch (e.g., main)
    const createBranchUrl = `https://api.github.com/repos/${user}/${repo}/git/refs`;
    const mainBranch = `refs/heads/${branch}`;
    const newBranchRef = `refs/heads/${newBranch}`;

    const branchResponse = await fetch(createBranchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${token}`,
      },
      body: JSON.stringify({
        ref: newBranchRef,
        sha: await getLatestCommitSha(user, repo, mainBranch, token),
      }),
    });

    if (!branchResponse.ok) {
      alert('Failed to create new branch.');
      return;
    }

    // Commit the new code to the new branch
    const commitUrl = `https://api.github.com/repos/${user}/${repo}/contents/${filePath}`;

    const parser = new DOMParser();
    const doc = parser.parseFromString(highlightedCode, 'text/html');
    const plainCode = doc.body.textContent || '';

    const commitResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${token}`,
      },
      body: JSON.stringify({
        message: `Update figma_variables.dart with latest code`,
        content: btoa(plainCode), // Encode code to Base64
        branch: newBranch,
      }),
    });

    if (!commitResponse.ok) {
      alert('Failed to commit code.');
      return;
    }

    // Create a pull request
    const pullRequestUrl = `https://api.github.com/repos/${user}/${repo}/pulls`;

    const pullRequestResponse = await fetch(pullRequestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${token}`,
      },
      body: JSON.stringify({
        title: 'Update figma_variables.dart',
        head: newBranch,
        base: branch,
        body: 'This pull request updates the figma_variables.dart file with the latest code.',
      }),
    });

    if (pullRequestResponse.ok) {
      alert('Pull request created successfully!');
    } else {
      const errorText = await pullRequestResponse.text();
      alert(`Failed to create pull request: ${errorText}`);
    }
  };

  // Get the latest commit SHA from the default branch
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
          <label class="block mb-2">Username</label>
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