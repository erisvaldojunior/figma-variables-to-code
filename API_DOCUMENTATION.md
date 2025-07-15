# Figma Variables to Code - API Documentation

## Overview

The **Figma Variables to Code** plugin is a comprehensive tool that converts Figma design variables and text styles into Dart code for Flutter applications. It provides automated code generation with support for multiple themes/modes and GitHub integration.

## Table of Contents

1. [Core Plugin API](#core-plugin-api)
2. [UI Components](#ui-components)
3. [Code Generators](#code-generators)
4. [Utility Functions](#utility-functions)
5. [Type Definitions](#type-definitions)
6. [Usage Examples](#usage-examples)

---

## Core Plugin API

### Main Plugin Function

The main entry point for the Figma plugin.

```typescript
export default function (): void
```

**Description**: Initializes the plugin UI and starts the code generation process.

**Behavior**:
- Opens a UI window (800x480 pixels)
- Generates variables, styles, and utility files
- Sends generated code to the UI via `figma.ui.postMessage`
- Handles clipboard notifications and GitHub settings

**Usage**:
```typescript
// Automatically called when plugin is run in Figma
// No manual invocation required
```

### Message Handling

The plugin handles several message types for communication between the main plugin and UI:

#### Supported Message Types:

- `code-copied-dart`: Notifies user when Dart code is copied
- `saveSettings`: Saves GitHub configuration to client storage
- `loadSettings`: Loads saved GitHub configuration

**Example**:
```typescript
figma.ui.onmessage = (message) => {
  if (message.type === 'code-copied-dart') {
    figma.notify('Dart code successfully copied to clipboard');
  }
  // ... other message handling
};
```

---

## UI Components

### Plugin Component

**File**: `src/ui/Plugin.tsx`

Main React component that renders the plugin interface.

```typescript
function Plugin(): JSX.Element
```

**Features**:
- Displays generated Dart code with syntax highlighting
- Provides copy-to-clipboard functionality
- Manages GitHub modal visibility
- Handles multiple variable/style modes

**State Management**:
```typescript
const [highlightedCode, setHighlightedCode] = useState('');
const [showGitHubModal, setShowGitHubModal] = useState(false);
const [stylesModesCodes, setStylesModesCodes] = useState<Record<string, string>>({});
```

**Usage**:
```typescript
import { render } from '@create-figma-plugin/ui';
export default render(Plugin);
```

### GitHubModal Component

**File**: `src/ui/GitHubModal.tsx`

Modal component for GitHub integration and repository synchronization.

```typescript
interface GitHubModalProps {
  onClose: () => void;
  highlightedCode: string;
  highlightedStylesCode: string;
  highlightedUtilsCode: string;
  highlightedStylesInterfaceCode: string;
  highlightedVariablesInterfaceCode: string;
  stylesModesCodes: Record<string, string>;
  variablesModesCodes: Record<string, string>;
}

export default function GitHubModal(props: GitHubModalProps): JSX.Element
```

**Features**:
- GitHub authentication with personal access tokens
- Automatic branch creation and pull request generation
- Batch file commits for all generated Dart files
- Settings persistence in Figma client storage

**GitHub API Integration**:
```typescript
// Create branch
const createBranchUrl = `https://api.github.com/repos/${username}/${repo}/git/refs`;

// Commit files
const commitUrl = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;

// Create pull request
const pullRequestUrl = `https://api.github.com/repos/${username}/${repo}/pulls`;
```

---

## Code Generators

### Variables Generator

**File**: `src/utils/variablesGenerators.ts`

Generates Dart code for Figma design variables.

#### Main Functions:

```typescript
function generateVariablesFile(): string
```
**Description**: Generates the main `figma_variables.dart` file with mode wrappers.

**Returns**: Complete Dart file content with imports, default mode exposure, and typed wrappers.

**Example Output**:
```dart
import 'figma_variables_dark.dart' as dark_mode;
import 'figma_variables_default.dart' as default_mode;
import 'figma_variables_interface.dart';

const colors = default_mode.Colors();

class ModeWrapper<Colors extends IColors> {
  const ModeWrapper({required this.colors});
  final Colors colors;
}

const darkMode = ModeWrapper<dark_mode.Colors>(
  colors: dark_mode.Colors(),
);
```

```typescript
function generateVariablesModesFiles(): Record<string, string>
```
**Description**: Generates individual Dart files for each Figma variable mode.

**Returns**: Object mapping mode names to their generated Dart code.

```typescript
function generateVariablesInterfaceFile(): string
```
**Description**: Generates TypeScript-style interfaces for all variable collections.

**Returns**: Interface definitions for type safety across modes.

#### Type Mappings:

| Figma Type | Dart Type |
|------------|-----------|
| `BOOLEAN`  | `bool`    |
| `COLOR`    | `Color`   |
| `FLOAT`    | `double`  |
| `STRING`   | `String`  |

### Styles Generator

**File**: `src/utils/stylesGenerators.ts`

Generates Dart code for Figma text styles.

#### Main Functions:

```typescript
function generateStylesFile(): string
```
**Description**: Generates the main `figma_styles.dart` file.

**Example Output**:
```dart
import 'figma_styles_dark.dart' as dark_mode show TextStyles;
import 'figma_styles_default.dart' as default_mode show TextStyles;
import 'figma_styles_interface.dart';

const textStyles = default_mode.TextStyles();

class ModeWrapper<T extends ITextStyles> {
  const ModeWrapper({required this.textStyles});
  final T textStyles;
}
```

```typescript
function generateStylesInterfaceFile(): string
```
**Description**: Generates interfaces for text style groups.

```typescript
function generateStylesModesFiles(): Record<string, string>
```
**Description**: Generates mode-specific text style implementations.

**Text Style Properties Supported**:
- Font family (with variable binding support)
- Font size (with variable binding support)
- Font weight (with variable binding support)
- Line height (with variable binding support)

### Utils Generator

**File**: `src/utils/utilsGenerators.ts`

Generates utility functions for Dart code.

```typescript
function generateUtilsFile(): string
```
**Description**: Generates `figma_utils.dart` with helper functions.

**Generated Functions**:

1. **Font Weight Mapping**:
```dart
FontWeight getFontWeight(String weight) {
  switch (weight.toLowerCase()) {
    case 'bold': return FontWeight.bold;
    case 'medium': return FontWeight.w500;
    // ... other mappings
    default: return FontWeight.normal;
  }
}
```

2. **Height Calculation**:
```dart
double getHeight(double lineHeight, double fontSize) {
  return lineHeight / fontSize;
}
```

---

## Utility Functions

### String Manipulation

**File**: `src/utils/string.ts`

#### Functions:

```typescript
function toCamelCase(str: string): string
```
**Description**: Converts strings to camelCase with digit prefix handling.

**Example**:
```typescript
toCamelCase("primary color") // "primaryColor"
toCamelCase("2x large") // "n2xLarge"
```

```typescript
function toPascalCase(str: string): string
```
**Description**: Converts strings to PascalCase.

**Example**:
```typescript
toPascalCase("primary colors") // "PrimaryColors"
```

```typescript
function formatModeNameForFile(modeName: string): string
```
**Description**: Formats mode names for file names (snake_case).

```typescript
function formatModeNameForVariable(modeName: string): string
```
**Description**: Formats mode names for variable names (camelCase).

### Color Conversion

**File**: `src/utils/converters.ts`

```typescript
function rgbaObjectToDartHexaString(obj: {r: number, g: number, b: number, a: number}): string
```
**Description**: Converts RGBA color objects to Dart Color constructors.

**Example**:
```typescript
rgbaObjectToDartHexaString({r: 1, g: 0, b: 0, a: 1})
// Returns: "Color(0xFFFF0000)"
```

### Code Formatting

**File**: `src/utils/dartFormat.ts`

```typescript
function formatLine(line: string, indentSpaces: number): string
```
**Description**: Formats Dart code lines to respect 80-character limit.

**Features**:
- Function call parameter splitting
- Proper indentation handling
- Nested structure awareness

### Clipboard Operations

**File**: `src/utils/copyToClipboard.ts`

```typescript
export default function copyToClipboard(highlightedCode: string): void
```
**Description**: Copies syntax-highlighted code to clipboard as plain text.

**Process**:
1. Parses HTML-highlighted code to extract plain text
2. Creates temporary textarea element
3. Executes copy command
4. Notifies plugin of successful copy

### Code Highlighting

**File**: `src/utils/highlightCode.ts`

```typescript
export default async function highlightCode(
  code: string, 
  setHighlightedCode: (highlighted: string) => void
): Promise<void>
```
**Description**: Syntax highlights Dart code using Shiki library.

**Configuration**:
- Language: `dart`
- Theme: `nord`

---

## Type Definitions

### Core Types

```typescript
interface VariableValueType {
  valueContent: string;
  valueType: 'alias' | 'color' | 'primitive' | undefined;
}

interface ImportItem {
  name: string;
  path: string;
  alias?: string;
}

interface GitHubModalProps {
  onClose: () => void;
  highlightedCode: string;
  highlightedStylesCode: string;
  highlightedUtilsCode: string;
  highlightedStylesInterfaceCode: string;
  highlightedVariablesInterfaceCode: string;
  stylesModesCodes: Record<string, string>;
  variablesModesCodes: Record<string, string>;
}
```

### Message Types

```typescript
type MessageType = 
  | 'code-copied-dart'
  | 'saveSettings'
  | 'loadSettings'
  | 'settingsLoaded';

interface SaveSettingsMessage {
  type: 'saveSettings';
  username: string;
  token: string;
  repo: string;
  branch: string;
  filePath: string;
}
```

---

## Usage Examples

### Basic Plugin Usage

1. **Install the plugin** in Figma from the Community or via manifest
2. **Open your design file** with variables and text styles
3. **Run the plugin** from the Plugins menu
4. **Copy generated code** using the copy buttons
5. **Paste into your Flutter project**

### GitHub Integration

```typescript
// Example GitHub configuration
const settings = {
  username: 'your-username',
  token: 'ghp_your-personal-access-token',
  repo: 'your-flutter-app',
  branch: 'main',
  filePath: 'lib/design-tokens/'
};
```

### Generated File Structure

```
lib/design-tokens/
├── figma_variables_interface.dart
├── figma_variables.dart
├── figma_variables_default.dart
├── figma_variables_dark.dart
├── figma_styles_interface.dart
├── figma_styles.dart
├── figma_styles_default.dart
├── figma_styles_dark.dart
└── figma_utils.dart
```

### Using Generated Code in Flutter

```dart
import 'package:your_app/design-tokens/figma_variables.dart';
import 'package:your_app/design-tokens/figma_styles.dart';

class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: colors.primary.red500, // Using default mode
      child: Text(
        'Hello World',
        style: textStyles.body.large, // Using default text style
      ),
    );
  }
}

// Using dark mode
class MyDarkWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: darkMode.colors.primary.red500, // Using dark mode
      child: Text(
        'Hello Dark World',
        style: darkMode.textStyles.body.large, // Using dark text style
      ),
    );
  }
}
```

### Variable Aliases

When Figma variables reference other variables, the generated code maintains these relationships:

```dart
// If secondary.blue references primary.blue in Figma
static const _secondaryBlue = primary.blue; // Generated as alias
```

### Custom Font Weight Handling

```dart
// Generated text style with variable binding
static final _heading1 = TextStyle(
  fontFamily: 'Roboto',
  fontSize: typography.fontSize.large,
  fontWeight: getFontWeight(typography.fontWeight.bold),
  height: getHeight(typography.lineHeight.large, typography.fontSize.large),
);
```

---

## Error Handling

### Common Issues and Solutions

1. **Missing Variables**: Plugin gracefully handles missing mode values by falling back to default mode
2. **Invalid Characters**: String utilities automatically sanitize names for Dart compatibility
3. **GitHub API Errors**: Modal provides user feedback for failed API calls
4. **Line Length**: Dart formatter ensures generated code respects 80-character limits

### Debug Information

The plugin includes warning comments in generated files:

```dart
// WARNING: This file is auto-generated by the figma-variables-to-code plugin.
// DO NOT manually modify this file. Any manual changes will be overwritten
// during the next generation process.
```

---

## Contributing

To extend the plugin functionality:

1. **Add new generators** in the `utils/` directory
2. **Follow naming conventions** using the string utility functions
3. **Include interface generation** for type safety
4. **Add comprehensive JSDoc** documentation
5. **Test with various Figma designs** to ensure robustness

### Code Style Guidelines

- Use TypeScript for type safety
- Include JSDoc comments for all public functions
- Follow existing file organization patterns
- Ensure generated Dart code follows Flutter conventions
- Use utility functions for consistent string transformations

---

This documentation covers all public APIs, functions, and components in the Figma Variables to Code plugin. For implementation details, refer to the source code in the respective files.