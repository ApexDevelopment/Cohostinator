// ==UserScript==
// @name		Cohostinator
// @match		*://cohost.org/*
// @version		0.5
// @run-at		document-end
// @grant		GM.getValue
// @grant		GM.setValue
// ==/UserScript==

;(function() {	
	let walkDOM = function(node, func) {
		func(node);
		node = node.firstChild;
		while (node) {
			walkDOM(node, func);
			node = node.nextSibling;
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
		let header = (await whenElementAvailable("header")).firstChild;
		console.log("Found header, we can proceed :3");

		let settings = {
			topNavbar: {
				type: "checkbox",
				friendlyName: "Top navbar",
				default: true,
				enable: async function() {
					let navUI = await whenElementAvailable(() => document.getElementById("headlessui-menu-items-:r0:"));
					navUI.classList.add("cohostinator-navui");
					navUI.classList.remove("text-sidebarText");
					navUI.classList.add("text-notBlack");
				
					let elts = document.querySelectorAll(".cohostinator-navui>a>li");
				
					for (let elt of elts) {
						if (elt.getAttribute("title") !== "get cohost Plus!") {
							elt.removeChild(elt.lastChild);
						}
					}

					let insertAfter = header.firstChild;

					if (insertAfter.classList.contains("lg:hidden")) {
						insertAfter = insertAfter.nextSibling;
					}

					insertAfter.after(navUI);
				},
				disable: async function() {
					alert("Top navbar is disabled, refresh the page to see the changes.");
				}
			},
			widePosts: {
				type: "checkbox",
				friendlyName: "Wider posts",
				default: true,
				enable: async function() {
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
		document.body.appendChild(settingsPage);
	
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
		header.classList.add("text-notBlack");
		walkDOM(header, removeLightText);
	
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
	
		header.insertBefore(settingsButton, header.lastChild);

		whenElementAvailable("main").then((main) => {
			main.firstChild.classList.add("cohostinator-mainui");
			whenElementAvailable(".cohostinator-mainui>section").then((postContainer) => {
				postContainer.classList.add("cohostinator-postcontainer");
			});
		});

		whenElementAvailable("section.border-sidebarAccent").then((cohostCorner) => {
			cohostCorner.classList.add("cohostinator-sidebar");
		});
	
		whenElementAvailable("a[href='https://cohost.org/rc/dashboard']").then((dashLink) => {
			let feedSelector = dashLink.parentNode.parentNode;
			feedSelector.classList.remove("text-notWhite");
			feedSelector.classList.add("text-notBlack");
		});
	
		whenElementAvailable("#app>.fixed").then((postButton) => {
			postButton.classList.add("text-notBlack");
			walkDOM(postButton, removeLightText);
		});
	
		// Try to match the profile bio area
		whenElementAvailable("div.relative.flex.break-words").then((profile) => {
			profile.classList.add("text-notBlack");
			walkDOM(profile, removeLightText);
		});
	};
	
	addEventListener("load", onLoad);
	})();