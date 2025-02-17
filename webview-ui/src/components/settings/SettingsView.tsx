import { VSCodeButton, VSCodeLink, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { memo, useEffect, useState } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { validateApiConfiguration, validateModelId } from "../../utils/validate"
import { vscode } from "../../utils/vscode"
import ApiOptions from "./ApiOptions"
import SettingsButton from "../common/SettingsButton"
import styled from "styled-components"
const IS_DEV = false // FIXME: use flags when packaging

type SettingsViewProps = {
	onDone: () => void
}
const DROPDOWN_Z_INDEX = 1004
const DropdownContainer = styled.div<{ zIndex?: number }>`
	position: relative;
	z-index: ${(props) => props.zIndex || DROPDOWN_Z_INDEX};

	// Force dropdowns to open downward
	& vscode-dropdown::part(listbox) {
		position: absolute !important;
		top: 100% !important;
		bottom: auto !important;
	}
`

const SettingsView = ({ onDone }: SettingsViewProps) => {
	const {
		apiConfiguration,
		version,
		customInstructions,
		openRouterModels,
		isLoggedIn,
		userInfo,
		projects,
		selectedProjectName,
	} = useExtensionState()
	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)
	const [modelIdErrorMessage, setModelIdErrorMessage] = useState<string | undefined>(undefined)
	const [selectedProject, setSelectedProject] = useState<string>(selectedProjectName || "")

	useEffect(() => {
		vscode.postMessage({ type: "getProjects" })
	}, [])

	useEffect(() => {
		if (selectedProjectName) {
			setSelectedProject(selectedProjectName)
		}
	}, [selectedProjectName])

	const handleProjectChange = (event: any) => {
		const projectName = event.target.value
		setSelectedProject(projectName)
		vscode.postMessage({ type: "projectSelected", projectName })
	}

	const handleSubmit = () => {
		const apiValidationResult = validateApiConfiguration(apiConfiguration)
		const modelIdValidationResult = validateModelId(apiConfiguration, openRouterModels)

		setApiErrorMessage(apiValidationResult)
		setModelIdErrorMessage(modelIdValidationResult)

		if (!apiValidationResult && !modelIdValidationResult) {
			vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
			vscode.postMessage({
				type: "customInstructions",
				text: customInstructions,
			})
			onDone()
		}
	}

	useEffect(() => {
		setApiErrorMessage(undefined)
		setModelIdErrorMessage(undefined)
	}, [apiConfiguration])

	// validate as soon as the component is mounted
	/*
	useEffect will use stale values of variables if they are not included in the dependency array. so trying to use useEffect with a dependency array of only one value for example will use any other variables' old values. In most cases you don't want this, and should opt to use react-use hooks.
	
	useEffect(() => {
		// uses someVar and anotherVar
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [someVar])

	If we only want to run code once on mount we can use react-use's useEffectOnce or useMount
	*/

	const handleResetState = () => {
		vscode.postMessage({ type: "resetState" })
	}

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				padding: "10px 0px 0px 20px",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "17px",
					paddingRight: 17,
				}}>
				<h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>Settings</h3>
				<VSCodeButton onClick={handleSubmit}>Done</VSCodeButton>
			</div>
			<div
				style={{
					flexGrow: 1,
					overflowY: "scroll",
					paddingRight: 8,
					display: "flex",
					flexDirection: "column",
				}}>
				{isLoggedIn ? (
					<div style={{ margin: "0 0 16px 0", textAlign: "center", color: "var(--vscode-foreground)" }}>
						{userInfo ? (
							<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
								<div style={{ fontWeight: "bold" }}>{userInfo.displayName}</div>
								<div>{userInfo.email}</div>
							</div>
						) : (
							<div>You are signed in with OpenGig</div>
						)}
					</div>
				) : (
					<VSCodeButton
						onClick={() => {
							// Generate nonce for state validation
							vscode.postMessage({ type: "accountLoginClicked" })
						}}
						style={{
							margin: "0 0 16px 0",
							width: "auto",
						}}>
						Sign in with OpenGig
					</VSCodeButton>
				)}
				{isLoggedIn ? (
					<VSCodeButton
						onClick={() => {
							// Generate nonce for state validation
							vscode.postMessage({ type: "accountLogoutClicked" })
						}}
						style={{
							margin: "0 0 16px 0",
							width: "auto",
						}}>
						Sign out
					</VSCodeButton>
				) : null}
				{isLoggedIn && (
					<DropdownContainer
						zIndex={DROPDOWN_Z_INDEX}
						style={{
							marginBottom: 5,
						}}
						className="dropdown-container">
						<VSCodeDropdown
							style={{
								minWidth: 130,
								width: "100%",
								position: "relative",
							}}
							onChange={handleProjectChange}
							value={selectedProject}>
							{!projects?.length ? (
								<VSCodeOption value="">Loading...</VSCodeOption>
							) : (
								<>
									<VSCodeOption value="">Select Project</VSCodeOption>
									{projects.map((project) => (
										<VSCodeOption key={project.uniqueName} value={project.uniqueName}>
											{project.title}
										</VSCodeOption>
									))}
								</>
							)}
						</VSCodeDropdown>
					</DropdownContainer>
				)}
				<div style={{ marginBottom: 5 }}>
					<ApiOptions
						showModelOptions={true}
						apiErrorMessage={apiErrorMessage}
						modelIdErrorMessage={modelIdErrorMessage}
					/>
				</div>

				{IS_DEV && (
					<>
						<div style={{ marginTop: "10px", marginBottom: "4px" }}>Debug</div>
						<VSCodeButton onClick={handleResetState} style={{ marginTop: "5px", width: "auto" }}>
							Reset State
						</VSCodeButton>
						<p
							style={{
								fontSize: "12px",
								marginTop: "5px",
								color: "var(--vscode-descriptionForeground)",
							}}>
							This will reset all global state and secret storage in the extension.
						</p>
					</>
				)}

				<div
					style={{
						marginTop: "auto",
						paddingRight: 8,
						display: "flex",
						justifyContent: "center",
					}}>
					<SettingsButton
						onClick={() => vscode.postMessage({ type: "openExtensionSettings" })}
						style={{
							margin: "0 0 16px 0",
						}}>
						<i className="codicon codicon-settings-gear" />
						Advanced Settings
					</SettingsButton>
				</div>
				<div
					style={{
						textAlign: "center",
						color: "var(--vscode-descriptionForeground)",
						fontSize: "12px",
						lineHeight: "1.2",
						padding: "0 8px 15px 0",
					}}>
					<p
						style={{
							wordWrap: "break-word",
							margin: 0,
							padding: 0,
						}}>
						If you have any questions or feedback, feel free to open an issue at{" "}
						<VSCodeLink href="https://github.com/cline/cline" style={{ display: "inline" }}>
							https://github.com/cline/cline
						</VSCodeLink>
					</p>
					<p
						style={{
							fontStyle: "italic",
							margin: "10px 0 0 0",
							padding: 0,
						}}>
						v{version}
					</p>
				</div>
			</div>
		</div>
	)
}

export default memo(SettingsView)
