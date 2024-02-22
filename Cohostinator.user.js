// ==UserScript==
// @name		Cohostinator
// @match		*://cohost.org/*
// @version		0.1
// @run-at		document-end
// @grant		GM.getValue
// @grant		GM.setValue
// ==/UserScript==

;(function() {
	let settings = {
		topNavbar: {
			type: "checkbox",
			friendlyName: "Top navbar",
			default: true
		},
		widePosts: {
			type: "checkbox",
			friendlyName: "Wider posts",
			default: true
		},
		forceAvis: {
			type: "list",
			friendlyName: "Force avatar shapes",
			values: ["Disable", "Circle", "Round Square", "Squircle"],
			default: "Disable"
		}
	};
	
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
			let e = selectorFunc();
			if (e) {
				res(e);
			}
			else {
				const observer = new MutationObserver(() => {
				let elt = selectorFunc();
				if (elt) {
					observer.disconnect();
					res(elt);
				}
			});
	
			observer.observe(document.body, { childList: true, subtree: true });
			}
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
					});
					break;
				case "list":
					settingInput.value = await getValue(settingId, settings[settingId].default);
					settingInput.addEventListener("change", (e) => {
						setValue(settingId, e.target.value);
					});
					break;
				default:
			}
		
			let settingLabel = document.createElement("label");
			settingLabel.innerText = settings[settingId].friendlyName;
			settingLabel.setAttribute("for", inputId);
			/*
			settingInput.addEventListener("change", (e) => {
				console.log("clicky");
				setValue(settingId, )
			});
			*/
			settingDiv.appendChild(settingLabel);
			settingDiv.appendChild(settingInput);
			settingsDiv.appendChild(settingDiv);
		}
	
		let footerDiv = document.createElement("div");
		footerDiv.innerHTML += "<span class='quiet'>by <a href='/apexpredator'>@apexpredator</a></span>";
		settingsPage.appendChild(footerDiv);
	
		let header = (await whenElementAvailable("header")).firstChild;
		console.log("Found header, we can proceed :3");
	
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
		settingsPage.toggleAttribute("show");
		});
	
		header.insertBefore(settingsButton, header.lastChild);
	
		whenElementAvailable("main").then((main) => {
		main.firstChild.classList.add("cohostinator-mainui");
		});
	
		whenElementAvailable(() => document.getElementById("headlessui-menu-items-:r0:")).then((navUI) => {
		navUI.classList.add("cohostinator-navui");
		navUI.classList.remove("text-sidebarText");
		navUI.classList.add("text-notBlack");
	
		let elts = document.querySelectorAll(".cohostinator-navui > a > li");
	
		for (let elt of elts) {
			if (elt.getAttribute("title") !== "get cohost Plus!") {
			elt.removeChild(elt.lastChild);
			}
		}
	
		header.insertBefore(navUI, settingsButton);
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
	
		whenElementAvailable("section.border-sidebarAccent").then((cohostCorner) => {
		cohostCorner.classList.add("cohostinator-sidebar");
	
		let hideButton = document.createElement("input");
		hideButton.setAttribute("type", "checkbox");
		hideButton.id = "cohostinator-hide-sidebar";
		let label = document.createElement("label");
		label.id = "cohostinator-hide-sidebar-arrow";
		label.setAttribute("for", "cohostinator-hide-sidebar");
		label.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6 transition-transform ui-open:rotate-180"><path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clip-rule="evenodd"></path></svg>`;
		cohostCorner.before(hideButton);
		cohostCorner.before(label);
		});
	
		// Try to match the profile bio area
		whenElementAvailable("div.relative.flex.break-words").then((profile) => {
		profile.classList.add("text-notBlack");
		walkDOM(profile, removeLightText);
		});
	};
	
	addEventListener("load", onLoad);
	})();