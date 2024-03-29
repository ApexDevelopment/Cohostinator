// ==UserScript==
// @name		Cohostinator
// @description Tweak and theme your Cohost!
// @namespace   https://badideas.cc/userscripts
// @downloadURL	https://badideas.cc/userscripts/Cohostinator.user.js
// @match		*://cohost.org/*
// @version		1.3.8
// @run-at		document-end
// @grant		GM.getValue
// @grant		GM.setValue
// @grant 		GM.xmlHttpRequest
// ==/UserScript==

const styles = `
.cohostinator-header {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.cohostinator-navui {
	white-space: nowrap;
}

.cohostinator-navui[top] {
	flex-grow: 2;
	flex-direction: row;
	border: none;
	background: none !important;
	box-shadow: none !important;
}

.cohostinator-navui[top]>a>li {
	padding: 4px;
}

.cohostinator-sb {
	font-weight: bold;
	padding: 4px;
}

.cohostinator-long-post {
	max-height: 80vh;
	overflow: hidden;
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

#live-dashboard {
	flex-grow: 2;
}

.cohostinator-sidebar {
	position: relative;
	overflow-x: hidden;
	left: 0;
	opacity: 1;
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

.co-thread-footer>div {
	gap: 1rem;
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
	let widePostsCSS = `.prose {
		max-width: none !important;
	}
	.cohostinator-mainui {
		display: flex;
	}
	
	.cohostinator-postcontainer {
		width: 100%;
	}
	
	.cohostinator-sidebar {
		max-width: 25%;
	}`;

	let watcher = {
		interval: null,
		selectorsAndCallbacks: new Map(),
		whenElementsAvailable: function(selector) {
			return new Promise((res) => {
				if (typeof selector === "string") {
					let selectorStr = selector;
					selector = function() {
						return document.querySelectorAll(selectorStr);
					}
				}

				let result = selector();

				if (result.length > 0) {
					res(result);
				}
				else {
					this.selectorsAndCallbacks.set(selector, res);

					if (this.interval === null) {
						this.startInterval();
					}
				}
			});
		},
		whenElementAvailableId: function(id) {
			return new Promise((res) => {
				let selector = function() {
					return document.getElementById(id);
				}
				
				let result = selector();

				if (result) {

					res(result);
				}
				else {
					this.selectorsAndCallbacks.set(selector, res);

					if (this.interval === null) {
						this.startInterval();
					}
				}
			});
		},
		startInterval: function() {
			this.interval = setInterval(() => {
				for (let [selector, callback] of this.selectorsAndCallbacks) {
					let result = selector();
					if (result && (result.length === undefined || result.length > 0)) {
						callback(result);
						this.selectorsAndCallbacks.delete(selector);
					}
				}

				if (this.selectorsAndCallbacks.size === 0) {
					clearInterval(this.interval);
					this.interval = null;
				}
			}, 50);
		},
		addObserver: function() {
			const observer = new MutationObserver(() => {
				for (let [selector, callback] of this.selectorsAndCallbacks) {
					let result = selector();
					if (result && (result.length === undefined || result.length > 0)) {
						callback(result);
						this.selectorsAndCallbacks.delete(selector);
					}
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });
			this.startInterval();
		}
	}

	watcher.addObserver();

	let rethemer = {
		colors: {
			mango: "201 107 18",
			foreground: "239 220 109",
			background: "0 0 0",
			"foreground-100": "255 249 242",
			"foreground-200": "255 183 115",
			"foreground-700": "153 51 0",
			"foreground-800": "158 50 0",
			notBlack: "25 25 25",
			notWhite: "255 249 242",
		},
		calculateLightness: function(rgb) {
			let [r, g, b] = rgb.split(" ").map((v) => parseInt(v));
			return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		},
		generateCSS: function() {
			let cssifiedColors = "";

			for (let color in rethemer.colors) {
				cssifiedColors += `--color-${color}: ${rethemer.colors[color]} !important;\n`;
			}

			return `:root {
				--color-accent: var(--color-notBlack) !important;
				--color-foreground-600: var(--color-mango) !important;
				${cssifiedColors}
			}

			.dark\\:bg-notBlack {
				background-color: rgb(var(--color-background)) !important;
			}

			.bg-notWhite {
				background-color: rgb(var(--color-foreground));
			}

			.bg-cherry-700 {
				background-color: rgb(var(--color-foreground-700)) !important;
			}

			.bg-cherry-500 { /* Needs dark text */
				background-color: rgb(var(--color-foreground)) !important;
			}

			.bg-cherry-300 {
				background-color: rgb(var(--color-foreground-800)) !important;
			}

			.text-cherry-700 {
				color: rgb(var(--color-foreground-200)) !important;
			}

			/* Should just catch the compose button */
			.hover\\:text-composeButton:hover {
				color: rgb(var(--color-foreground-800)) !important;
			}
			.hover\\:fill-text:hover {
				fill: rgb(var(--color-foreground-100)) !important;
			}

			.cohostinator-navui {
				background-color: rgb(var(--color-foreground)) !important;
			}

			.text-onBackground-dynamic {
				color: rgb(var(--color-${rethemer.calculateLightness(rethemer.colors.background) > 0.25 ? "notBlack" : "notWhite" })) !important;
			}
			
			.text-onForeground-dynamic {
				color: rgb(var(--color-${rethemer.calculateLightness(rethemer.colors.foreground) > 0.25 ? "notBlack" : "notWhite" })) !important;
			}`;
		}

	}

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

	let extractRGB = function(hexColor) {
		return hexColor.substring(1).match(/.{2}/g).map((v) => parseInt(v, 16)).join(" ");
	}
	
	let onLoad = async function() {
		console.log("Injecting styles...");
		let mainStyle = document.createElement("style");
		mainStyle.innerHTML = styles;
		document.head.appendChild(mainStyle);

		let rethemeStyle = document.createElement("style");
		rethemeStyle.id = "cohostinator-retheme";

		let header = (await watcher.whenElementsAvailable("header"))[0].firstChild;
		header.classList.add("cohostinator-header");
		console.log("Found header, we can proceed :3");

		let settings = {
			topNavbar: {
				type: "checkbox",
				friendlyName: "Top navbar",
				default: true,
				_backupText: new Map(),
				enable: async function() {
					let navUI = (await watcher.whenElementsAvailable(".cohostinator-navui"))[0];

					// Takes up one column of space if wide posts are disabled (mainui is not flexed)
					let fillerDiv = document.createElement("div");
					fillerDiv.id = "cohostinator-filler";
					navUI.after(fillerDiv);

					// For some reason the navbar on the following page does not have text
					if (window.location.pathname !== "/rc/project/following") {
						let elts = document.querySelectorAll(".cohostinator-navui>a>li");
					
						for (let elt of elts) {
							if (elt.getAttribute("title") !== "get cohost Plus!") {
								this._backupText.set(elt, elt.innerText);
								// Remove children that are text nodes
								for (let child of elt.childNodes) {
									if (child.nodeType === Node.TEXT_NODE) {
										elt.removeChild(child);
									}
								}
							}
						}
					}

					watcher.whenElementsAvailable(".cohostinator-navui>a[href='#']").then((bookmarks) => {
						bookmarks = bookmarks[0];
						// Clone the node
						let bookmarksClone = bookmarks.cloneNode(true);
						// Add in place
						bookmarks.after(bookmarksClone);
						// Hide original
						bookmarks.style.display = "none";
						
						bookmarksClone.classList.add("cohostinator-bookmarksFix");
						bookmarksClone.setAttribute("href", "/rc/bookmarks");
						this._backupText.set(bookmarksClone.firstChild, "bookmarked tags");
					});

					navUI.setAttribute("top", "true");

					let insertAfter = header.firstChild;

					if (insertAfter.classList.contains("lg:hidden")) {
						insertAfter = insertAfter.nextSibling;
					}

					insertAfter.after(navUI);
				},
				disable: async function() {
					let navUI = (await watcher.whenElementsAvailable(".cohostinator-navui"))[0];
					let elts = document.querySelectorAll(".cohostinator-navui>a>li");
				
					for (let elt of elts) {
						if (elt.getAttribute("title") !== "get cohost Plus!") {
							elt.appendChild(document.createTextNode(this._backupText.get(elt)));
						}
					}

					navUI.removeAttribute("top");

					let fillerDiv = document.getElementById("cohostinator-filler");
					if (fillerDiv) {
						fillerDiv.remove();
					}

					watcher.whenElementsAvailable(".cohostinator-mainui").then((main) => {
						main[0].firstChild.before(navUI);
					});

					watcher.whenElementsAvailable(".cohostinator-navui>a[href='#']").then((bookmarks) => {
						bookmarks[0].style.display = "block";
					});

					watcher.whenElementsAvailable(".cohostinator-bookmarksFix").then((bookmarksClone) => {
						bookmarksClone[0].remove();
					});
				}
			},
			clipLongPosts: {
				type: "checkbox",
				friendlyName: "Clip long posts",
				default: true,
				_clipPost: async function(el, value) {
					let height = el.offsetHeight;
					if (value && height > window.innerHeight * 1.5 && !el.classList.contains("cohostinator-long-post-expanded") && !el.classList.contains("cohostinator-long-post")) {
						el.classList.add("cohostinator-long-post");
						// Add a label to expand the post
						let label = document.createElement("div");
						label.classList.add("cohostinator-long-post-label");
						label.innerText = `Long post clipped! Click to expand. Original size: ${Math.round(height / window.innerHeight)}x screen height.`;
						// Lol
						el.parentNode.lastChild.firstChild.firstChild.after(label);

						label.addEventListener("click", () => {
							el.classList.add("cohostinator-long-post-expanded");
							el.classList.remove("cohostinator-long-post");
							label.remove();
						});
					}
					else if (!value && el.classList.contains("cohostinator-long-post")) {
						el.classList.remove("cohostinator-long-post");
					}
				},
				load: async function() {
					const observer = new MutationObserver(async () => {
						let els = document.querySelectorAll("article.co-post-box>div");
						let value = await getValue("clipLongPosts", true);
						for (let el of els) {
							this._clipPost(el, value);
						}
					});
		
					observer.observe(document.body, { childList: true, subtree: true });
				},
				enable: async function() {
					let els = document.querySelectorAll("article.co-post-box>div");
					for (let el of els) {
						this._clipPost(el, true);
					}
				},
				disable: async function() {
					let els = document.querySelectorAll("article.co-post-box>div");
					for (let el of els) {
						this._clipPost(el, false);
					}

					let labels = document.querySelectorAll(".cohostinator-long-post-label");
					for (let label of labels) {
						label.remove();
					}
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
					
					let widePostsStyle = document.createElement("style");
					widePostsStyle.innerHTML = widePostsCSS;
					widePostsStyle.id = "cohostinator-wideposts";
					document.head.appendChild(widePostsStyle);

					watcher.whenElementsAvailable(".cohostinator-sidebar").then((sidebar) => {
						sidebar = sidebar[0];
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

					watcher.whenElementAvailableId("cohostinator-wideposts").then((style) => {
						style.remove();
					});
					
					watcher.whenElementsAvailable(".cohostinator-sidebar").then((sidebar) => {
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
			},
			retheme: {
				type: "checkbox",
				friendlyName: "Retheme",
				default: true,
				_backupClasses: new Map(),
				enable: async function() {
					document.head.appendChild(rethemeStyle);

					watcher.whenElementsAvailable(".cohostinator-navui").then((navUI) => {
						navUI = navUI[0];
						this._backupClasses.set(navUI, navUI.getAttribute("class"));
						navUI.classList.remove("text-sidebarText");
						navUI.classList.add("text-onForeground-dynamic");
					});

					watcher.whenElementsAvailable("a[href='https://cohost.org/rc/dashboard']").then((dashLink) => {
						let feedSelector = dashLink[0].parentNode.parentNode;
						this._backupClasses.set(feedSelector, feedSelector.getAttribute("class"));
						feedSelector.classList.remove("text-notWhite");
						feedSelector.classList.add("text-onForeground-dynamic");
					});
				
					watcher.whenElementsAvailable("#app>.fixed").then((postButton) => {
						postButton = postButton[0];
						this._backupClasses.set(postButton, postButton.getAttribute("class"));
						postButton.classList.add("text-onForeground-dynamic");
						walkDOM(postButton, (elt) => {
							this._backupClasses.set(elt, elt.getAttribute("class"));
							removeLightText(elt);
						});
					});
				
					// Try to match the profile bio area
					watcher.whenElementsAvailable("div.relative.flex.break-words").then((profile) => {
						profile = profile[0];
						profile.classList.add("text-onForeground-dynamic");
						walkDOM(profile, (elt) => {
							this._backupClasses.set(elt, elt.getAttribute("class"));
							removeLightText(elt);
						});
					});

					watcher.whenElementsAvailable(".co-prose").then((elts) => {
						for (let elt of elts) {
							this._backupClasses.set(elt, elt.getAttribute("class"));
							elt.classList.add("text-onBackground-dynamic");
						}
					});

					watcher.whenElementsAvailable(".co-project-display-name").then((elts) => {
						for (let elt of elts) {
							this._backupClasses.set(elt, elt.getAttribute("class"));
							elt.classList.add("text-onBackground-dynamic");
						}
					});
/*
					// Notifications tab boxes
					whenElementAvailable(() => document.querySelectorAll(".co-notification-group-header").length > 0).then(() => {
						let elts = document.querySelectorAll(".co-project-display-name");
						for (let elt of elts) {
							this._backupClasses.set(elt, elt.getAttribute("class"));
						}
					});
*/
					watcher.whenElementsAvailable(".bg-cherry-500").then((elts) => {
						for (let elt of elts) {
							this._backupClasses.set(elt, elt.getAttribute("class"));
							if (elt.classList.contains("text-notWhite") || elt.classList.contains("text-text")) {
								elt.classList.remove("text-notWhite");
								elt.classList.remove("text-text");
							}
							
							elt.classList.add("text-onForeground-dynamic");
						}
					});

					walkDOM(header, (elt) => {
						this._backupClasses.set(elt, elt.getAttribute("class"));
						removeLightText(elt);
						if (elt.classList.contains("text-notBlack")) {
							elt.classList.remove("text-notBlack");
						}
					});
					
					this._backupClasses.set(header, header.getAttribute("class"));
					header.classList.add("text-onForeground-dynamic");
				},
				disable: async function() {
					rethemeStyle.remove();
					
					for (let [elt, classes] of this._backupClasses) {
						elt.setAttribute("class", classes);
					}
				}
			},
			colorBackground: {
				type: "color",
				friendlyName: "Background color",
				default: "#000000",
				change: async function(value) {
					rethemer.colors.background = extractRGB(value);
					rethemeStyle.innerHTML = rethemer.generateCSS();
				}
			},
			colorForeground1: {
				type: "color",
				friendlyName: "Main foreground color",
				default: "#EFDC6D",
				change: async function(value) {
					rethemer.colors.foreground = extractRGB(value);
					
					// Dynamically generate 100, 200, 700, 800
					let rgb = extractRGB(value).split(" ");
					let r = parseInt(rgb[0]);
					let g = parseInt(rgb[1]);
					let b = parseInt(rgb[2]);
					// 100 is used for hover effects, so has to be slightly lighter than main FG
					let r100 = Math.min(Math.floor(r * 1.1), 255);
					let g100 = Math.min(Math.floor(g * 1.1), 255);
					let b100 = Math.min(Math.floor(b * 1.1), 255);
					// 200 is used for text, so has to be slightly lighter than main FG
					let r200 = Math.floor(r * 1.1);
					let g200 = Math.floor(g * 1.1);
					let b200 = Math.floor(b * 1.1);
					let r700 = Math.floor(r * 0.6);
					let g700 = Math.floor(g * 0.6);
					let b700 = Math.floor(b * 0.6);
					let r800 = Math.floor(r * 0.7);
					let g800 = Math.floor(g * 0.7);
					let b800 = Math.floor(b * 0.7);

					rethemer.colors["foreground-100"] = `${r100} ${g100} ${b100}`;
					rethemer.colors["foreground-200"] = `${r200} ${g200} ${b200}`;
					rethemer.colors["foreground-700"] = `${r700} ${g700} ${b700}`;
					rethemer.colors["foreground-800"] = `${r800} ${g800} ${b800}`;

					rethemeStyle.innerHTML = rethemer.generateCSS();
				}
			},
			colorAccent: {
				type: "color",
				friendlyName: "Accent color",
				default: "#C96B12",
				change: async function(value) {
					rethemer.colors.mango = extractRGB(value);
					rethemeStyle.innerHTML = rethemer.generateCSS();
				}
			},
			colorNotBlack: {
				type: "color",
				friendlyName: "Dark text+panel color",
				default: "#191919",
				change: async function(value) {
					rethemer.colors.notBlack = extractRGB(value);
					rethemeStyle.innerHTML = rethemer.generateCSS();
				}
			},
			colorNotWhite: {
				type: "color",
				friendlyName: "Light text color",
				default: "#FFF9F2",
				change: async function(value) {
					rethemer.colors.notWhite = extractRGB(value);
					rethemeStyle.innerHTML = rethemer.generateCSS();
				}
			}
		};

		console.log("Doing magic!");
	
		/* Create the settings page */
		let settingsPage = document.createElement("div");
		settingsPage.id = "cohostinator-settings";
		settingsPage.classList.add("text-onForeground-dynamic", "rounded-lg", "border", "border-sidebarAccent");
	
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
				case "color":
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
		// Check for updates
		let timeSinceLastCheck = await getValue("lastUpdateCheck", 0);
		let now = Date.now();
		if (now - timeSinceLastCheck > 1000 * 60 * 60 * 24) {
			setValue("lastUpdateCheck", now);
			
			GM.xmlHttpRequest({
				method: "GET",
				responseType: "text",
				url: "https://badideas.cc/userscripts/Cohostinator.user.js",
				onload: (response) => {
					let match = response.responseText.match(/@version\s+([0-9.]+)/);
					if (match && match[1] !== GM.info.script.version) {
						footerDiv.innerHTML += `<span class='quiet'> | <a href='https://badideas.cc/userscripts/Cohostinator.user.js'>Update available!</a></span>`;
					}
				}
			});
		}
		settingsPage.appendChild(footerDiv);
		
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

		if (window.location.pathname === "/apexpredator") {
			let fsDiv = document.createElement("div");
			fsDiv.id = "fscreen";
			let apexStyle = document.createElement("style");
			apexStyle.innerHTML = `
			div>div>div:has(>img[alt='apexpredator']) {
				position: relative;
			}
			
			#fscreen {
				visibility: hidden;
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background-color: rgb(0, 0, 0);
				z-index: 99;
				opacity: 0;
			}
			
			#fscreen[activate] {
				animation: fsappear 10s forwards;
			}

			@keyframes fsappear {
				from {
					opactiy: 0;
					visibility: hidden;
				}
				to {
					opacity: 1;
					visibility: visible;
				}
			}`;
			document.head.appendChild(apexStyle);

			watcher.whenElementsAvailable("div>div>div:has(>img[alt='apexpredator'])").then((img) => {
				img = img[0];

				img.addEventListener("mouseenter", () => {
					img.style.zIndex = "100";
					fsDiv.setAttribute("activate", "true");
				});

				img.addEventListener("mouseleave", () => {
					img.style.zIndex = "0";
					fsDiv.removeAttribute("activate");
				});

				img.parentElement.before(fsDiv);
			});
		}

		watcher.whenElementsAvailable("main").then((main) => {
			main[0].firstChild.classList.add("cohostinator-mainui");
			watcher.whenElementsAvailable(".cohostinator-mainui>section").then((postContainer) => {
				postContainer[0].classList.add("cohostinator-postcontainer");
			});
		});

		watcher.whenElementsAvailable("section.border-sidebarAccent").then((cohostCorner) => {
			cohostCorner[0].classList.add("cohostinator-sidebar");
		});

		watcher.whenElementAvailableId("headlessui-menu-items-:r0:").then((navUI) => {
			navUI.classList.add("cohostinator-navui");
		});
	};
	
	addEventListener("load", onLoad);
})();