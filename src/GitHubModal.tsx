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
  const [branchField, setBranchField] = useState('');
  const [workflowField, setWorkflowField] = useState('');

  const onPressSendToProvider = async () => {
    const branch = branchField;
    const user = usernameField;
    const repo = repositoryField;
    const token = tokenField;
    const workflow = workflowField;

    const url = `https://api.github.com/repos/${user}/${repo}/actions/workflows/${workflow}/dispatches`;

    const body = {
      ref: branch,
      inputs: {
        branch,
        code: highlightedCode, // Use the highlighted Dart code here
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `token ${token}`,
    };

    await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const text = await res.text();
        if (res.status >= 200 && res.status < 300) {
          alert('Generated File successfully sent to GitHub!');
        } else {
          alert(text);
        }
      })
      .catch((error) => alert(error));
  };

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
          <label class="block mb-2">Token</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={tokenField}
            onChange={(e) => setTokenField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Repository</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={repositoryField}
            onChange={(e) => setRepositoryField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Branch</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={branchField}
            onChange={(e) => setBranchField((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Workflow</label>
          <input
            type="text"
            class="w-full p-2 rounded bg-gray-700 text-white"
            value={workflowField}
            onChange={(e) => setWorkflowField((e.target as HTMLInputElement).value)}
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