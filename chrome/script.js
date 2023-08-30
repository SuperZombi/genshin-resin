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


function makeRequest(div){
	function intToTime(totalSeconds){
		let hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
		totalSeconds %= 3600;
		let minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
		let seconds = String(totalSeconds % 60).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`
	}
	function updateTime(newTime){
		if (newTime % 480 == 0){
			let resign = div.querySelector("#resin #resin-area > .text")
			let currentResin = parseInt(resign.getAttribute("current")) + 1
			resign.setAttribute("current", currentResin)
			resign.innerHTML = `${currentResin}/160`
		}
		let description = div.querySelector("#resin #resin-description")
		description.querySelector("#full-recover").innerHTML = intToTime(newTime)
		description.querySelector("#next-recover").innerHTML = intToTime(newTime % 480)

		if (newTime <= 0){
			return
		}
		setTimeout(_=>{
			updateTime(newTime - 1)
		}, 1000)
	}
	function initResinTimer(currentResin, fullRecover){
		let resign = div.querySelector("#resin #resin-area > .text")
		resign.setAttribute("current", currentResin)
		resign.innerHTML = `${currentResin}/160`
		if (fullRecover != 0){
			updateTime(fullRecover)
		}
	}

	div.classList.remove("error")
	div.classList.add("active")
	div.innerHTML = `
		<img src="${chrome.runtime.getURL("images/loader.svg")}" height="80%" width="80%" style="margin:auto;">
	`

	let xhr = new XMLHttpRequest();
	const target = new URL('https://genshin-api.superzombi.repl.co/getOriginalResin');
	const params = new URLSearchParams();
	params.set('ltuid', getCookie('ltuid') || getCookie('ltuid_v2'));
	params.set('ltoken', getCookie('ltoken') || getCookie('ltoken_v2'));
	target.search = params.toString();
	xhr.open("GET", target.href, true)
	xhr.onload = _=>{
		if (xhr.status == 200){
			let answer = JSON.parse(xhr.response);
			div.classList.add("transparent")
			div.innerHTML = `
				<div id="resin">
					<div id="resin-description">
						<span class="text">${get_message("full_recover")}</span>
						<span class="time" id="full-recover">00:00:00</span>
						<div style="height: 5px"></div>
						<span class="text">${get_message("next_recover")}</span>
						<span class="time" id="next-recover">00:00:00</span>
					</div>
					<div id="resin-area">
						<img src="${chrome.runtime.getURL("images/original_resin.png")}">
						<span class="text" current="0">0/160</span>
					</div>
				</div>
			`
			initResinTimer(answer.current_resin, answer.full_recover)
		} else{
			console.error("Error fetching /getOriginalResin")
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
