function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
}

const locales = {
	'en': {
		"full_recover": "Fully replenished",
		"next_recover": "Replenished in"
	},
	'ru': {
		"full_recover": "Полное восстановление",
		"next_recover": "След. восстановление"
	}
}

function get_message(name, default_="en"){
	var userLang = (getCookie("mi18nLang") || navigator.language || navigator.userLanguage).slice(0,2).toLowerCase();
	if (Object.keys(locales).includes(userLang) && Object.keys(locales[userLang]).includes(name)){
		return locales[userLang][name]
	}
	return locales[default_][name]
}

window.onload = _=>{
	let div = document.createElement("div")
	div.id = "resin_plugin"
	div.innerHTML = `
		<img src="${chrome.runtime.getURL("images/original_resin.png")}" height="100%" width="100%">
	`
	div.onclick = _=>{
		div.onclick = null;
		makeRequest(div)
	}
	document.body.appendChild(div)
}


async function makeRequest(div, object="resin"){
	function intToTime(totalSeconds){
		let hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
		totalSeconds %= 3600;
		let minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
		let seconds = String(totalSeconds % 60).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`
	}
	function updateTime(newTime, type="resin"){
		let description = div.querySelector("#resin #resin-description")
		if (!description){return}
		if (type == "resin"){
			if (newTime % 480 == 0){
				let resign = div.querySelector("#resin #resin-area > .text")
				let currentResin = parseInt(resign.getAttribute("current")) + 1
				resign.setAttribute("current", currentResin)
				resign.innerHTML = `${currentResin}/160`
			}
			description.querySelector("#next-recover").innerHTML = intToTime(newTime % 480)
		}
		description.querySelector("#full-recover").innerHTML = intToTime(newTime)

		if (newTime <= 0){
			return
		}
		setTimeout(_=>{
			updateTime(newTime - 1, type)
		}, 1000)
	}
	function initResinTimer(currentResin, maxResin, fullRecover, type="resin"){
		let resign = div.querySelector("#resin #resin-area > .text")
		resign.setAttribute("current", currentResin)
		resign.setAttribute("max", maxResin)
		resign.innerHTML = `${currentResin}/${maxResin}`
		if (fullRecover != 0){
			updateTime(fullRecover, type)
		}
	}

	div.classList.remove("transparent")
	div.classList.remove("error")
	div.classList.add("active")
	div.innerHTML = `
		<img src="${chrome.runtime.getURL("images/loader.svg")}" height="80%" width="80%" style="margin:auto;">
	`

	function header(regions=null){
		let header = document.createElement("div")
		header.className = "head"
		header.innerHTML = `
			<select id="server-select">
				<option value="" style="text-align: center;">Server</option>
				<option value="EU">Euro</option>
				<option value="US">America</option>
				<option value="AS">Asia</option>
				<option value="TW">Taiwan</option>
			</select>
			<div class="switch-field">
				<input type="radio" name="realm-resin" value="realm" id="toggle-realm"/>
				<label for="toggle-realm"><img src="${chrome.runtime.getURL("images/realm_currency.png")}"></label>
				<input type="radio" name="realm-resin" value="resin" id="toggle-resin"/>
				<label for="toggle-resin"><img src="${chrome.runtime.getURL("images/original_resin.png")}"></label>
			</div>
		`
		if (regions){
			for (let region of regions){
				let e = header.querySelector(`#server-select option[value="${region}"]`)
				e.style.display = "block"
			}
		} else{
			header.querySelectorAll("#server-select option").forEach(e=>{
				e.style.display = "block"
			})
		}
		return header.outerHTML
	}


	let xhr = new XMLHttpRequest();
	let api = object == "resin" ? "getOriginalResin" : "getRealmCurrency"
	const target = new URL(`https://genshin-api.superzombi.repl.co/${api}`);
	const params = new URLSearchParams();

	let ltuid = getCookie('ltuid') || getCookie('ltuid_v2');
	let ltmid = getCookie('ltmid') || getCookie('ltmid_v2');
	let ltoken = getCookie('ltoken') || getCookie('ltoken_v2');

	if (ltoken){
		save_user_account(ltoken)
	} else{
		let data = await get_user_account();
		ltoken = data.ltoken;
	}

	params.set('ltuid', ltuid);
	params.set('ltmid', ltmid);
	params.set('ltoken', ltoken);
	let prefer_region = window.localStorage.getItem("prefer_region")
	if (prefer_region){
		params.set('prefer_region', prefer_region);
	}
	target.search = params.toString();
	xhr.open("GET", target.href, true)
	xhr.onload = _=>{
		if (xhr.status == 200){
			let answer = JSON.parse(xhr.response);
			div.classList.add("transparent")
			div.innerHTML = `
				<div id="resin">
					<div id="resin-description">
						${header(answer.user_regions)}
						<div style="height: 5px"></div>
						<span class="text">${get_message("full_recover")}</span>
						<span class="time" id="full-recover">00:00:00</span>
						${object == "resin" ? `
							<div style="height: 5px"></div>
							<span class="text">${get_message("next_recover")}</span>
							<span class="time" id="next-recover">00:00:00</span>
						` : ""}
					</div>
					<div id="resin-area">
						${object == "resin" ? `
							<img src="${chrome.runtime.getURL("images/original_resin.png")}">
						` : `
							<img src="${chrome.runtime.getURL("images/realm_currency.png")}">
						`}
						<span class="text" current="0">0/160</span>
					</div>
				</div>
			`
			if (object == "resin"){
				div.querySelector("#toggle-resin").checked = true
				initResinTimer(answer.current_resin, answer.max_resin, answer.full_recover)
			} else{
				div.querySelector("#toggle-realm").checked = true
				initResinTimer(answer.current_realm, answer.max_realm, answer.full_recover, "realm")
			}
			div.querySelector(`#server-select option[value="${answer.current_region}"]`).selected = true;
			after()
		} else{
			console.error(`Error fetching /${api}`)

			////////////////////////////////////////
			let xhr = new XMLHttpRequest();
			const target = new URL('https://genshin-api.superzombi.repl.co/getUserRegions');
			target.search = params.toString();
			xhr.open("GET", target.href, true)
			xhr.onload = _=>{
				if (xhr.status == 200){
					let answer = JSON.parse(xhr.response);
					div.classList.add("transparent")
					div.innerHTML = `
						<div id="resin">
							<div id="resin-description">
								${header(answer.user_regions)}
							</div>
							<div id="resin-area"><img src="${chrome.runtime.getURL("images/original_resin.png")}"></div>
						</div>
					`
					div.querySelector("#toggle-resin").checked = true
					after()
				}
				else{
					console.error('Error fetching /getUserRegions')
					div.classList.remove("active")
					div.classList.add("error")
					setTimeout(_=>{div.classList.remove("error")}, 2000)
					div.innerHTML = `
						<img src="${chrome.runtime.getURL("images/original_resin.png")}" height="100%" width="100%">
					`
					div.onclick = _=>{
						div.onclick = null;
						makeRequest(div)
					}
				}
			}
			xhr.send()
		}
	}
	xhr.send()

	function after(){
		div.querySelectorAll(".switch-field input").forEach(e=>{
			e.onclick = _=>{
				makeRequest(div, e.value)
			}
		})
		div.querySelector("#server-select").onchange = e=>{
			window.localStorage.setItem("prefer_region", e.target.value)
			let target = div.querySelector(".switch-field input:checked").value
			makeRequest(div, target)
		}
	}
}

async function get_user_account(){
	return new Promise((resolve)=>{
		chrome.storage.sync.get(["ltoken"], function(items){
			resolve(items)
		});
	})
}
function save_user_account(ltoken){
	chrome.storage.sync.set({"ltoken": ltoken});
}
