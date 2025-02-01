// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require("child_process");
const { parseProject } = require('./callGraph.js');

// function to get directory Tree structure of current wd (reference for error logging context later on)
function getDirectoryTree(dirPath, options = {}) {
	const {
		ignore = ['.git', 'node_modules'],
		maxDepth = Infinity,
		currentDepth = 0
	} = options;
	let tree = '';
	try {
		if (currentDepth >= maxDepth) return tree;
		const items = fs.readdirSync(dirPath)
			.filter(item => !ignore.includes(item));
		items.forEach((item, index) => {
			const fullPath = path.join(dirPath, item);
			const isLast = index === items.length - 1;
			const prefix = '  '.repeat(currentDepth) + (isLast ? '└── ' : '├── ');
			try {
				const stats = fs.statSync(fullPath);
				tree += prefix + item + '\n';

				if (stats.isDirectory()) {
					tree += getDirectoryTree(fullPath, {
						...options,
						currentDepth: currentDepth + 1
					});
				}
			} catch (err) {
				console.error(`Error processing ${fullPath}: ${err.message}`);
			}
		});
		return tree;
	} catch (err) {
		console.error(`Error reading directory ${dirPath}: ${err.message}`);
		return tree;
	}
}

// function for input specified function on currently opened .c file by user
function readCFile(workspacePath, cProjectDir, function_name) {
	let context;
	// invoke callGraph function
	try { 
		context = parseProject(workspacePath);
		// returns the following:
		console.log(context.functionMap);
		// console.log(context.callMatrix);
		console.log(context.adjacencyMatrix);
		console.log(context.functionIndex);
		// console.log(context.allFunctions);
	} catch (error) {
		console.log('Error while reading CFile\n', error);
	}
	// // copy and reverse key-values (for later reference)
	// const pathFunctionMap = Object.fromEntries(
	// 	Object.entries(context.functionMap).map(([key, value]) => [value, key])
	// );
	// let parameters = false;
	// if (function_name.endsWith(')')) {
	// 	// since parameters are specified, it'll have to be an exact match
	// 	parameters = true;
	// }

	// Parse for function name within (case-sensitive, startswith match)
	for (let funcProcessed in context.functionMap) {
		// because it has to be an exact match, now that all functions are taken into account
		// (parameters) ? funcProcessed = key : funcProcessed = key.match(/^(\w+)/)[1];
		if (funcProcessed.startsWith(function_name) && cProjectDir === context.functionMap[funcProcessed]) { // if found return context
			// const output = [
			// 	context.functionMap[key],
			// pathFunctionMap,
			// 	context.functionMap,
			// 	context.adjacencyMatrix,
			// 	context.functionIndex
			// ];
			return context;
		}
	}
	// function not found
	vscode.window.showErrorMessage(`Specified function ${function_name} was not found within active file`);
	return null; // Return null if no match found
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "harness" is now active!');
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json

	// hello world function (for testing)
	const disposable = vscode.commands.registerCommand('harness.helloworld', function () {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		console.log("Extension Successfully Activated")
		vscode.window.showInformationMessage('Hello World from the harness extension!');
	});
	// generation function
	const generation = vscode.commands.registerCommand('harness.generation', async function () {
		console.log('Harness generation called');
		// Usage
		const folderUri = vscode.workspace.workspaceFolders?.[0]?.uri;
		if (!folderUri) {
			vscode.window.showErrorMessage("No workspace folder is open.");
			return;
		}
		// 
		// Convert that URI to a standard file system path.
		const workspacePath = folderUri.fsPath;
		// traverse that path to get dir tree structure (can be used later in error logging)
		const tree = getDirectoryTree(workspacePath, {
			ignore: ['.git', 'node_modules'],
			maxDepth: 3 // maximum depth is limited to 3 for now
		});
		// console.log(tree);
		const editor = vscode.window.activeTextEditor;
		let filePath;
		let file_name;
		if (editor) {
			filePath = editor.document.uri.fsPath; // Get the full path
			const getFileExtension = path => path.replace(/.*\//, ''); // function for parsing path with regex
			file_name = getFileExtension(filePath);
			// console.log(file_name);
			if (!file_name.endsWith('.c')) {
				vscode.window.showErrorMessage("Current active file must be a C file!");
				return;
			}
		} else {
			vscode.window.showErrorMessage("No active file in workspace found!");
			return;
		}
		vscode.window.showInformationMessage(`Harness generation extension activated on ${file_name}`);
		const cProjectDir = filePath; // user specified file and function should be within project directory
		// console.log("Navigating into cProjectDir:", cProjectDir);
		// prompt the user for target function name
		const function_name = await vscode.window.showInputBox({ prompt: 'Enter target function name' });
		if (!function_name) {
			vscode.window.showErrorMessage(`Target function name within ${file_name} is required!`);
			return;
		}
		// parse specified C file for target function
		const context_output = readCFile(workspacePath, cProjectDir, function_name);
		if (context_output === null) return;
		// Execute logic using the provided inputs
		vscode.window.showInformationMessage(`Generating harness for: ${file_name} -> Function: ${function_name}`);
		// dfs to retrieve all relevant function info
		
	});

	// cleanup
	context.subscriptions.push(disposable);
	context.subscriptions.push(generation);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
