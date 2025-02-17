// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import delay from "delay"
import * as vscode from "vscode"
import { ClineProvider } from "./core/webview/ClineProvider"
import { Logger } from "./services/logging/Logger"
import { createClineAPI } from "./exports"
import "./utils/path" // necessary to have access to String.prototype.toPosix
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/DiffViewProvider"
import { OgToolsService } from "./services/og-tools/OgToolsService"

/*
Built using https://github.com/microsoft/vscode-webview-ui-toolkit

Inspired by
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra

*/

let outputChannel: vscode.OutputChannel

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("Cline")
	context.subscriptions.push(outputChannel)

	Logger.initialize(outputChannel)
	Logger.log("Cline extension activated")

	const sidebarProvider = new ClineProvider(context, outputChannel)

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ClineProvider.sideBarId, sidebarProvider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.plusButtonClicked", async () => {
			Logger.log("Plus button Clicked")
			await sidebarProvider.clearTask()
			await sidebarProvider.postStateToWebview()
			await sidebarProvider.postMessageToWebview({
				type: "action",
				action: "chatButtonClicked",
			})
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.mcpButtonClicked", () => {
			sidebarProvider.postMessageToWebview({
				type: "action",
				action: "mcpButtonClicked",
			})
		}),
	)

	const openClineInNewTab = async () => {
		Logger.log("Opening Cline in new tab")
		// (this example uses webviewProvider activation event which is necessary to deserialize cached webview, but since we use retainContextWhenHidden, we don't need to use that event)
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
		const tabProvider = new ClineProvider(context, outputChannel)
		//const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
		const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor) => editor.viewColumn || 0))

		// Check if there are any visible text editors, otherwise open a new group to the right
		const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0
		if (!hasVisibleEditors) {
			await vscode.commands.executeCommand("workbench.action.newGroupRight")
		}
		const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two

		const panel = vscode.window.createWebviewPanel(ClineProvider.tabPanelId, "OG Assistant", targetCol, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [context.extensionUri],
		})
		// TODO: use better svg icon with light and dark variants (see https://stackoverflow.com/questions/58365687/vscode-extension-iconpath)

		panel.iconPath = {
			light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_light.png"),
			dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_dark.png"),
		}
		tabProvider.resolveWebviewView(panel)

		// Lock the editor group so clicking on files doesn't open them over the panel
		await delay(100)
		await vscode.commands.executeCommand("workbench.action.lockEditorGroup")
	}

	context.subscriptions.push(vscode.commands.registerCommand("cline.popoutButtonClicked", openClineInNewTab))
	context.subscriptions.push(vscode.commands.registerCommand("cline.openInNewTab", openClineInNewTab))

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.settingsButtonClicked", () => {
			//vscode.window.showInformationMessage(message)
			sidebarProvider.postMessageToWebview({
				type: "action",
				action: "settingsButtonClicked",
			})
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.historyButtonClicked", () => {
			sidebarProvider.postMessageToWebview({
				type: "action",
				action: "historyButtonClicked",
			})
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.accountLoginClicked", () => {
			sidebarProvider.postMessageToWebview({
				type: "action",
				action: "accountLoginClicked",
			})
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.editCodeWithPrompt", async () => {
			const editor = vscode.window.activeTextEditor
			if (!editor) {
				vscode.window.showWarningMessage("No active editor found.")
				return
			}

			const selection = editor.selection
			if (selection.isEmpty) {
				vscode.window.showWarningMessage("No text selected.")
				return
			}

			const selectedText = editor.document.getText(selection)
			const fullFileContent = editor.document.getText()
			const filePath = editor.document.fileName
			const languageId = editor.document.languageId

			// Get edit instruction from user
			const editInstruction = await vscode.window.showInputBox({
				prompt: "What changes would you like to make to the selected code?",
				placeHolder: "e.g., Refactor this code to be more efficient",
			})

			if (!editInstruction) {
				return // User cancelled the input
			}

			// Format the task message with code context
			const taskMessage = `Please help modify this code:
Selected code:
\`\`\`${languageId}
${selectedText}
\`\`\`
Instruction: ${editInstruction}
File context: @/${vscode.workspace.asRelativePath(filePath)}
Don't Do anything else, it just simple in-file change just do the task and complete the task, don't ask for testing, directly use task completion tool
`

			// Initialize a new task with the code editing request
			await sidebarProvider.initClineWithTask(taskMessage)
		}),
	)

	/*
	We use the text document content provider API to show the left side for diff view by creating a virtual document for the original content. This makes it readonly so users know to edit the right side if they want to keep their changes.

	- This API allows you to create readonly documents in VSCode from arbitrary sources, and works by claiming an uri-scheme for which your provider then returns text contents. The scheme must be provided when registering a provider and cannot change afterwards.
	- Note how the provider doesn't create uris for virtual documents - its role is to provide contents given such an uri. In return, content providers are wired into the open document logic so that providers are always considered.
	https://code.visualstudio.com/api/extension-guides/virtual-documents
	*/
	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider))

	// URI Handler (Implicit Flow)
	const handleUri = async (uri: vscode.Uri) => {
		console.log("URI Handler called with:", {
			path: uri.path,
			fragment: uri.fragment,
			query: uri.query,
			scheme: uri.scheme,
		})

		const visibleProvider = ClineProvider.getVisibleInstance()
		if (!visibleProvider) {
			return
		}

		if (uri.path === "/auth") {
			try {
				const fragmentParams = new URLSearchParams(uri.query.replace(/\+/g, "%2B"))
				const accessCode = fragmentParams.get("code")
				const accessToken = fragmentParams.get("token")
				const state = fragmentParams.get("state")

				const storedState = await visibleProvider.getSecret("authState")
				console.log("Stored state:", storedState)
				console.log("Received state:", state)

				if (state !== storedState) {
					vscode.window.showErrorMessage("Authentication failed: Invalid state.")
					return
				}
				// const accessToken = await OgToolsService.getAccessTokenFromCode(accessCode ?? "", state)
				const user = await OgToolsService.getCurrentUser(accessToken ?? "")
				if (user) {
					await visibleProvider.setUserInfo(user)
				}
				if (accessToken) {
					await visibleProvider.handleAuthCallback(accessToken)
				} else {
					vscode.window.showErrorMessage("Authentication failed: No access token received.")
				}
			} catch (e) {
				console.log(e)
				vscode.window.showErrorMessage("Authentication failed: No access token received.")
			}
		}
	}
	context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }))

	return createClineAPI(outputChannel, sidebarProvider)
}

// This method is called when your extension is deactivated
export function deactivate() {
	Logger.log("Cline extension deactivated")
}
