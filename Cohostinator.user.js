// ==UserScript==
// @name		Cohostinator
// @match		*://cohost.org/*
// @version		0.9
// @run-at		document-end
// @grant		GM.getValue
// @grant		GM.setValue
// ==/UserScript==

const styles = `
:root[retheme] {
	--color-mango: 201 107 18 !important;
	--color-accent: var(--color-notBlack) !important;
	--color-foreground: 239 220 109 !important;
	--color-background: 0 0 0 !important;
	--color-foreground-200: 255 183 115 !important;
	--color-foreground-600: var(--color-mango) !important;
	--color-foreground-700: 153 51 0 !important;
	--color-foreground-800: 158 50 0 !important;
}

.bg-cherry-500[retheme] { /* Needs dark text */
	background-color: rgb(var(--color-foreground)) !important;
}

.bg-cherry-300[retheme] {
	background-color: rgb(var(--color-foreground-800)) !important;
}

.text-cherry-700[retheme] {
	color: rgb(var(--color-foreground-200)) !important;
}

.cohostinator-header {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.cohostinator-navui[retheme] {
	background-color: rgb(var(--color-foreground));
}

.cohostinator-navui[top] {
	flex-grow: 2;
	flex-direction: row;
	background: none;
	border: none;
	box-shadow: none !important;
}

.cohostinator-navui[top]>a>li {
	padding: 4px;
}

.cohostinator-sb {
	font-weight: bold;
	padding: 4px;
}

#cohostinator-settings {
	box-sizing: border-box;
	padding: 12px;
	position: absolute;
	right: 4px;
	top: -9999px;
	background-color: rgb(var(--color-foreground));
	color: rgb(var(--color-notWhite));
	opacity: 0;
	z-index: 100;
}

#cohostinator-settings *.quiet {
	color: rgb(var(--color-notWhite));
}

#cohostinator-settings[retheme], #cohostinator-settings[retheme] *.quiet {
	color: rgb(89, 89, 87);
}

#cohostinator-settings a:hover {
	text-decoration: underline;
}

#cohostinator-settings.show {
	animation: chsettings-appear 0.5s forwards;
}

@keyframes chsettings-appear {
	0% {
		top: calc(4rem + 10px);
		opacity: 0;
	}
	100% {
		top: calc(4rem + 4px);
		opacity: 1;
	}
}

.cohostinator-setting {
	display: flex;
	gap: 0.5rem;
	justify-content: space-between;
	align-items: center;
}

.cohostinator-setting select {
	background-position: right -0.1rem center;
	padding-top: 0.1rem;
	padding-bottom: 0.1rem;
	padding-left: 0.5rem;
	padding-right: 1.1rem;
	line-height: 1rem;
}

.cohostinator-mainui.cohostinator-wideposts {
	display: flex;
}

.cohostinator-postcontainer.cohostinator-wideposts {
	width: 100%;
}

#live-dashboard {
	flex-grow: 2;
}

.cohostinator-sidebar {
	position: relative;
	overflow-x: hidden;
	left: 0;
	opacity: 1;
}

.cohostinator-sidebar.cohostinator-wideposts {
	max-width: 25%;
}

main .co-post-box {
	max-width: none !important;
}

#cohostinator-hide-sidebar-arrow {
	cursor: pointer;
}

#cohostinator-hide-sidebar {
	position: absolute;
	top: -9999px;
	left: -9999px;
}

#cohostinator-hide-sidebar:checked ~ .cohostinator-sidebar {
	animation: chsidebar-dismiss 0.5s forwards;
}

#cohostinator-hide-sidebar:not(:checked) ~ .cohostinator-sidebar {
	animation: chsidebar-recall 0.5s forwards;
}

#cohostinator-hide-sidebar-arrow>svg {
	transform: rotate(270deg);
}

#cohostinator-hide-sidebar:checked ~ #cohostinator-hide-sidebar-arrow>svg {
	transform: rotate(90deg);
}

@keyframes chsidebar-dismiss {
	0% {
		width: auto;
		left: 0;
		opacity: 1;
	}
	99% {
		width: auto;
		left: 5vw;
		opacity: 0;
	}
	100% {
		width: 0;
		opacity: 0;
	}
}

@keyframes chsidebar-recall {
	0% {
		width: 0;
		opacity: 0;
	}
	1% {
		width: auto;
		opacity: 0;
		left: 5vw;
	}
	100% {
		width: auto;
		opacity: 1;
		left: 0;
	}
}
`

;(function() {	
	let walkDOM = function(node, func) {
		func(node);
		node = node.firstElementChild;
		while (node) {
			walkDOM(node, func);
			node = node.nextElementSibling;
		}
	};
	
	let removeLightText = function(node) {
		if (node.classList?.contains("text-notWhite")) {
			node.classList.remove("text-notWhite");
		}
		else if (node.classList?.contains("text-text")) {
			node.classList.remove("text-text");
		}
	};
	
	// Hacky way to wait for elements to load or short circuit if they exist already
	// A function can be provided because for some reason querySelector and getElementById validate input differently??
	let whenElementAvailable = function(selectorOrFunction) {
		let selectorFunc;
	
		if (typeof selectorOrFunction === "string") {
			selectorFunc = () => {
				return document.querySelector(selectorOrFunction);
			};
		}
		else {
			selectorFunc = selectorOrFunction;
		}
	
		return new Promise((res) => {
			let interval;
			let searchForElement = (obs) => {
				let elt = selectorFunc();
				if (elt) {
					obs.disconnect();
					clearInterval(interval);
					res(elt);
				}
			};

			const observer = new MutationObserver(() => {
				searchForElement(observer);
			});

			// For some reason doing both of these at the same time is the only reliable way to find elements
			// This sucks!
			observer.observe(document.body, { childList: true, subtree: true });
			interval = setInterval(searchForElement, 50, observer);
		});
	};
	
	let getValue = async function(key, defaultValue) {
		key = "chin8r-" + key;
		if (GM && GM.getValue) {
			return await GM.getValue(key, defaultValue);
		}
	
		if (!localStorage[key]) {
			return defaultValue;
		}
	
		return localStorage[key];
	};
	
	let setValue = async function(key, value) {
		key = "chin8r-" + key;
		if (GM && GM.setValue) {
			GM.setValue(key, value);
		}
		else {
			localStorage[key] = value;
		}
	};
	
	let onLoad = async function() {
		console.log("Injecting styles...");
		let style = document.createElement("style");
		style.innerHTML = styles;
		document.head.appendChild(style);

		let header = (await whenElementAvailable("header")).firstChild;
		console.log("Found header, we can proceed :3");

		let settings = {
			retheme: {
				type: "checkbox",
				friendlyName: "Retheme",
				default: true,
				_backupClasses: new Map(),
				enable: async function() {
					document.documentElement.setAttribute("retheme", "true");

					whenElementAvailable("#cohostinator-settings").then((settings) => {
						settings.setAttribute("retheme", "true");
					});

					whenElementAvailable(".cohostinator-navui").then((navUI) => {
						navUI.classList.remove("text-sidebarText");
						navUI.classList.add("text-notBlack");
						navUI.setAttribute("retheme", "true");
					});

					whenElementAvailable("a[href='https://cohost.org/rc/dashboard']").then((dashLink) => {
						let feedSelector = dashLink.parentNode.parentNode;
						feedSelector.classList.remove("text-notWhite");
						feedSelector.classList.add("text-notBlack");
					});
				
					whenElementAvailable("#app>.fixed").then((postButton) => {
						postButton.classList.add("text-notBlack");
						walkDOM(postButton, (elt) => {
							this._backupClasses.set(elt, elt.getAttribute("class"));
						});
						walkDOM(postButton, removeLightText);
					});
				
					// Try to match the profile bio area
					whenElementAvailable("div.relative.flex.break-words").then((profile) => {
						profile.classList.add("text-notBlack");
						walkDOM(profile, (elt) => {
							this._backupClasses.set(elt, elt.getAttribute("class"));
						});
						walkDOM(profile, removeLightText);
					});

					whenElementAvailable(() => document.querySelectorAll(".bg-cherry-300").length > 0).then(() => {
						let elts = document.querySelectorAll(".bg-cherry-300");
						for (let elt of elts) {
							elt.setAttribute("retheme", "true");
						}
					});

					whenElementAvailable(() => document.querySelectorAll(".bg-cherry-500").length > 0).then(() => {
						let elts = document.querySelectorAll(".bg-cherry-500");
						for (let elt of elts) {
							this._backupClasses.set(elt, elt.getAttribute("class"));
							if (elt.classList.contains("text-notWhite") || elt.classList.contains("text-text")) {
								elt.classList.remove("text-notWhite");
								elt.classList.remove("text-text");
							}
							elt.setAttribute("retheme", "true");
							elt.classList.add("text-notBlack");
						}
					});

					whenElementAvailable(() => document.querySelectorAll(".bg-cherry-700").length > 0).then(() => {
						let elts = document.querySelectorAll(".bg-cherry-700");
						for (let elt of elts) {
							elt.setAttribute("retheme", "true");
						}
					});

					walkDOM(header, (elt) => {
						this._backupClasses.set(elt, elt.getAttribute("class"));
					});
					
					walkDOM(header, removeLightText);
					header.classList.add("text-notBlack");
				},
				disable: async function() {
					document.querySelectorAll("*[retheme]").forEach((elt) => {
						elt.removeAttribute("retheme");
						if (this._backupClasses.has(elt)) {
							elt.setAttribute("class", this._backupClasses.get(elt));
						}
					});

					whenElementAvailable(".cohostinator-navui").then((navUI) => {
						navUI.classList.add("text-sidebarText");
						navUI.classList.remove("text-notBlack");
					});

					whenElementAvailable("a[href='https://cohost.org/rc/dashboard']").then((dashLink) => {
						let feedSelector = dashLink.parentNode.parentNode;
						feedSelector.classList.add("text-notWhite");
						feedSelector.classList.remove("text-notBlack");
					});
				
					whenElementAvailable("#app>.fixed").then((postButton) => {
						postButton.classList.remove("text-notBlack");
						walkDOM(postButton, (elt) => {
							if (this._backupClasses.has(elt)) {
								elt.setAttribute("class", this._backupClasses.get(elt));
							}
						});
					});
				
					// Try to match the profile bio area
					whenElementAvailable("div.relative.flex.break-words").then((profile) => {
						profile.classList.remove("text-notBlack");
						walkDOM(profile, (elt) => {
							if (this._backupClasses.has(elt)) {
								elt.setAttribute("class", this._backupClasses.get(elt));
							}
						});
					});

					walkDOM(header, (elt) => {
						if (this._backupClasses.has(elt) && elt !== header) {
							elt.setAttribute("class", this._backupClasses.get(elt));
						}
					});
					header.classList.remove("text-notBlack");
				}
			},
			topNavbar: {
				type: "checkbox",
				friendlyName: "Top navbar",
				default: true,
				_backupText: new Map(),
				enable: async function() {
					let navUI = await whenElementAvailable(".cohostinator-navui");

					// For some reason the navbar on the following page does not have text
					if (window.location.pathname !== "/rc/project/following") {
						let elts = document.querySelectorAll(".cohostinator-navui>a>li");
					
						for (let elt of elts) {
							if (elt.getAttribute("title") !== "get cohost Plus!") {
								this._backupText.set(elt, elt.innerText);
								elt.removeChild(elt.lastChild);
							}
						}
					}

					navUI.setAttribute("top", "true");

					let insertAfter = header.firstChild;

					if (insertAfter.classList.contains("lg:hidden")) {
						insertAfter = insertAfter.nextSibling;
					}

					insertAfter.after(navUI);
				},
				disable: async function() {
					let navUI = await whenElementAvailable(".cohostinator-navui");
					let elts = document.querySelectorAll(".cohostinator-navui>a>li");
				
					for (let elt of elts) {
						if (elt.getAttribute("title") !== "get cohost Plus!") {
							elt.appendChild(document.createTextNode(this._backupText.get(elt)));
						}
					}

					navUI.removeAttribute("top");

					whenElementAvailable(".cohostinator-mainui").then((main) => {
						main.firstChild.before(navUI);
					});
				}
			},
			widePosts: {
				type: "checkbox",
				friendlyName: "Wider posts",
				default: true,
				enable: async function() {
					if (window.location.pathname === "/rc/project/notifications" || window.location.pathname === "/rc/project/edit") {
						return;
					}

					whenElementAvailable(".cohostinator-mainui").then((main) => {
						main.classList.add("cohostinator-wideposts");
					});

					whenElementAvailable(".cohostinator-postcontainer").then((main) => {
						main.classList.add("cohostinator-wideposts");
					});

					whenElementAvailable(".cohostinator-sidebar").then((sidebar) => {
						sidebar.classList.add("cohostinator-wideposts");

						let hideButton = document.createElement("input");
						hideButton.setAttribute("type", "checkbox");
						hideButton.id = "cohostinator-hide-sidebar";
						let label = document.createElement("label");
						label.id = "cohostinator-hide-sidebar-arrow";
						label.setAttribute("for", "cohostinator-hide-sidebar");
						label.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6 transition-transform ui-open:rotate-180"><path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clip-rule="evenodd"></path></svg>`;
						sidebar.before(hideButton);
						sidebar.before(label);
					});
				},
				disable: async function() {
					if (window.location.pathname === "/rc/project/notifications" || window.location.pathname === "/rc/project/edit") {
						return;
					}

					whenElementAvailable(".cohostinator-mainui").then((main) => {
						main.classList.remove("cohostinator-wideposts");
					});

					whenElementAvailable(".cohostinator-postcontainer").then((main) => {
						main.classList.remove("cohostinator-wideposts");
					});
					
					whenElementAvailable(".cohostinator-sidebar").then((sidebar) => {
						sidebar.classList.remove("cohostinator-wideposts");
						document.getElementById("cohostinator-hide-sidebar").remove();
						document.getElementById("cohostinator-hide-sidebar-arrow").remove();
					});
				}
			},
			forceAvis: {
				type: "list",
				friendlyName: "Force avatar shapes",
				values: ["Disable", "Circle", "Round Square", "Squircle"],
				default: "Disable",
				_updateAvi: async function(el, value) {
					if (value === "Disable") return;
					el.classList.remove("mask-circle", "mask-roundrect", "mask-squircle");
					switch(value) {
						case "Circle":
							el.classList.add("mask-circle");
							break;
						case "Round Square":
							el.classList.add("mask-roundrect");
							break;
						case "Squircle":
							el.classList.add("mask-squircle");
							break;
						default:
					}
				},
				load: async function() {
					const observer = new MutationObserver(async () => {
						let els = document.querySelectorAll("a.mask>img.mask");
						let value = await getValue("forceAvis", "Disable");
						for (let el of els) {
							this._updateAvi(el, value);
						}
					});
		
					observer.observe(document.body, { childList: true, subtree: true });
				},
				change: async function(value) {
					let els = document.querySelectorAll("a.mask>img.mask");
					for (let el of els) {
						this._updateAvi(el, value);
					}	
				}
			}
		};

		console.log("Doing magic!");
	
		/* Create the settings page */
		let settingsPage = document.createElement("div");
		settingsPage.id = "cohostinator-settings";
		settingsPage.classList.add("text-notBlack", "rounded-lg");
	
		let title = document.createElement("div");
		title.innerHTML = "<strong>Cohostinator Settings</strong>";
		settingsPage.appendChild(title);
	
		let settingsDiv = document.createElement("div");
		settingsPage.appendChild(settingsDiv);
	
		for (let settingId in settings) {
			if (settings[settingId].load) {
				settings[settingId].load();
			}

			let settingInput;
			let settingDiv = document.createElement("div");
			settingDiv.classList.add("cohostinator-setting");
			const inputId = `cohostinator-${settingId}`;
		
			if (settings[settingId].type === "list") {
				settingInput = document.createElement("select");
				settingInput.id = inputId;
		
				for (let choice of settings[settingId].values) {
					let option = document.createElement("option");
					option.setAttribute("value", choice);
					option.innerText = choice;
					settingInput.appendChild(option);
				}
			}
			else {
				settingInput = document.createElement("input");
				settingInput.id = inputId;
				settingInput.setAttribute("type", settings[settingId].type);
			}

			switch(settings[settingId].type) {
				case "checkbox":
					settingInput.checked = await getValue(settingId, settings[settingId].default);
					settingInput.addEventListener("change", (e) => {
						setValue(settingId, e.target.checked);
						if (settings[settingId].enable && e.target.checked) {
							settings[settingId].enable();
						}

						if (settings[settingId].disable && !settingInput.checked) {
							settings[settingId].disable();
						}
					});

					if (settings[settingId].enable && settingInput.checked) {
						settings[settingId].enable();
					}

					break;
				case "list":
					settingInput.value = await getValue(settingId, settings[settingId].default);
					settingInput.addEventListener("change", (e) => {
						setValue(settingId, e.target.value);
						if (settings[settingId].change) {
							settings[settingId].change(e.target.value);
						}
					});

					if (settings[settingId].change) {
						settings[settingId].change(settingInput.value);
					}

					break;
				default:
			}
		
			let settingLabel = document.createElement("label");
			settingLabel.innerText = settings[settingId].friendlyName;
			settingLabel.setAttribute("for", inputId);
			
			settingDiv.appendChild(settingLabel);
			settingDiv.appendChild(settingInput);
			settingsDiv.appendChild(settingDiv);
		}
	
		let footerDiv = document.createElement("div");
		footerDiv.innerHTML += "<span class='quiet'>by <a href='/apexpredator'>@apexpredator</a></span>";
		settingsPage.appendChild(footerDiv);
	
		header.classList.add("cohostinator-header");
	
		/* Inject settings button */
		let settingsButton = document.createElement("button");
		settingsButton.classList.add("cohostinator-sb", "rounded-lg", "border", "border-transparent", "px-1", "py-3", "hover:border-accent", "hover:text-accent", "lg:hover:border-sidebarAccent", "lg:hover:text-sidebarAccent");
		let sbInnerDiv = document.createElement("div");
		sbInnerDiv.innerText = "in8r";
		sbInnerDiv.style.transform = "rotate(-15deg)";
		settingsButton.appendChild(sbInnerDiv);
		settingsButton.addEventListener("click", () => {
			settingsPage.classList.toggle("show");
		});
	
		header.lastChild.appendChild(settingsButton);
		header.lastChild.appendChild(settingsPage);

		whenElementAvailable("main").then((main) => {
			main.firstChild.classList.add("cohostinator-mainui");
			whenElementAvailable(".cohostinator-mainui>section").then((postContainer) => {
				postContainer.classList.add("cohostinator-postcontainer");
			});
		});

		whenElementAvailable("section.border-sidebarAccent").then((cohostCorner) => {
			cohostCorner.classList.add("cohostinator-sidebar");
		});

		whenElementAvailable(() => document.getElementById("headlessui-menu-items-:r0:")).then((navUI) => {
			navUI.classList.add("cohostinator-navui");
		});
	};
	
	addEventListener("load", onLoad);
})();