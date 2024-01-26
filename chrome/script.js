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
	function getUnixTime(){
		return Math.floor(Date.now() / 1000)
	}
	function updateTime(fullRecover, type="resin", calculateCurrent){
		let targetTime = getUnixTime() + parseInt(fullRecover)
		function render(){
			let timeRemaining = Math.max(0, targetTime - getUnixTime())
			let description = div.querySelector("#resin #resin-description")
			if (!description){return}

			let current = calculateCurrent(timeRemaining)
			let container = div.querySelector("#resin #resin-area > .text")
			if (container.getAttribute("current") != current){
				container.setAttribute("current", current)
				container.innerHTML = `${current}/${container.getAttribute("max")}`
			}

			if (type == "resin"){
				description.querySelector("#next-recover").innerHTML = intToTime(timeRemaining % 480)
			} else{
				description.querySelector("#next-recover").innerHTML = intToTime(timeRemaining % 3600)
			}
			description.querySelector("#full-recover").innerHTML = intToTime(timeRemaining)

			if (timeRemaining <= 0){return}
			setTimeout(render, 1000)
		}
		render()
	}
	function initResinTimer(current, max, fullRecover, type="resin"){
		let container = div.querySelector("#resin #resin-area > .text")
		container.setAttribute("current", current)
		container.setAttribute("max", max)
		container.innerHTML = `${current}/${max}`
		if (fullRecover != 0){
			let calculate;
			if (type == "resin"){
				calculate = (timeRemaining)=>{
					return Math.floor((76800 - timeRemaining) / 480)
				}
			}
			else{
				let realmPerHour = Math.floor(3600 * (parseInt(max) - parseInt(current)) / parseInt(fullRecover))
				let maxRecoverTime = parseInt(max) * 3600 / realmPerHour
				calculate = (timeRemaining)=>{
					return Math.floor((maxRecoverTime - timeRemaining) / 3600) * realmPerHour
				}
			}
			updateTime(fullRecover, type, calculate)
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

	getUserAccounts().then(async (accounts) => {
		let user_regions = getUserRegions(accounts)
		let account = getAccount(accounts, window.localStorage.getItem("prefer_region"))
		let current_region = Object.keys(GenshinServers).find(key => GenshinServers[key] === account.region)
		let notes = await getDailyNotes(account.game_uid, account.region)
		if (notes){
			div.classList.add("transparent")
			div.innerHTML = `
				<div id="resin">
					<div id="resin-description">
						${header(user_regions)}
						<div style="height: 5px"></div>
						<span class="text">${get_message("full_recover")}</span>
						<span class="time" id="full-recover">00:00:00</span>
						<div style="height: 5px"></div>
						<span class="text">${get_message("next_recover")}</span>
						<span class="time" id="next-recover">00:00:00</span>
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
				initResinTimer(notes.current_resin, notes.max_resin, notes.resin_recovery_time)
			} else{
				div.querySelector("#toggle-realm").checked = true
				initResinTimer(notes.current_home_coin, notes.max_home_coin, notes.home_coin_recovery_time, "realm")
			}
			div.querySelector(`#server-select option[value="${current_region}"]`).selected = true;
			after()
		} else{
			div.classList.add("transparent")
			div.innerHTML = `
				<div id="resin">
					<div id="resin-description">
						${header(user_regions)}
					</div>
					<div id="resin-area"><img src="${chrome.runtime.getURL("images/original_resin.png")}"></div>
				</div>
			`
			div.querySelector("#toggle-resin").checked = true
			after()
		}

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
	}).catch((error) => {
		console.error(error)
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
	});
}

const GenshinServers = {
	US: "os_usa",
	EU: "os_euro",
	AS: "os_asia",
	TW: "os_cht"
}
function getUserAccounts(){
	return new Promise((resolve, reject)=>{
		let xhr = new XMLHttpRequest();
		xhr.open("GET", 'https://api-account-os.hoyolab.com/binding/api/getUserGameRolesByLtoken?game_biz=hk4e_global', true)
		xhr.withCredentials = true;
		xhr.onload = _=>{
			if (xhr.status == 200){
				let answer = JSON.parse(xhr.response);
				const data = answer?.data?.list;
				if (!data){return reject("Error fetching")}
				resolve(data)
			}
		}
		xhr.send()
	})
}
function getAccount(accounts, prefer_region=""){
	if (prefer_region){
		let arr = accounts.filter(x=>x.region == GenshinServers[prefer_region])
		if (arr.length > 0){return arr[0]}
	}
	return accounts[0]
}
function getUserRegions(accounts){
	return accounts.map(obj => {
		return Object.keys(GenshinServers).find(key => GenshinServers[key] === obj.region);
	});
}
function getDailyNotes(uid, server){
	return new Promise((resolve)=>{
		let xhr = new XMLHttpRequest();
		xhr.open("GET", `https://bbs-api-os.hoyolab.com/game_record/genshin/api/dailyNote?role_id=${uid}&server=${server}`, true)
		xhr.withCredentials = true;
		xhr.setRequestHeader('x-rpc-client_type', '5');
		xhr.setRequestHeader('x-rpc-app_version', '1.5.0');
		xhr.setRequestHeader('ds', generate_dynamic_secret());
		xhr.onload = _=>{
			if (xhr.status == 200){
				let answer = JSON.parse(xhr.response);
				resolve(answer.data)
			}
		}
		xhr.send()
	})
}

function generate_dynamic_secret(salt="6s25p5ox5y14umn1p61aqyyvbvvl3lrt"){
	let t = Math.floor(Date.now()/1000);
	let r = Array.from({length:6},()=>Math.random().toString(36)[2]).join('');
	let data = `salt=${salt}&t=${t}&r=${r}`;
	let hash = MD5(data);
	return `${t},${r},${hash}`;
}
function MD5(r){function n(r,n){var t,o,e,u,f;return e=2147483648&r,u=2147483648&n,f=(1073741823&r)+(1073741823&n),(t=1073741824&r)&(o=1073741824&n)?2147483648^f^e^u:t|o?1073741824&f?3221225472^f^e^u:1073741824^f^e^u:f^e^u}function t(r,t,o,e,u,f,a){return r=n(r,n(n(t&o|~t&e,u),a)),n(r<<f|r>>>32-f,t)}function o(r,t,o,e,u,f,a){return r=n(r,n(n(t&e|o&~e,u),a)),n(r<<f|r>>>32-f,t)}function e(r,t,o,e,u,f,a){return r=n(r,n(n(t^o^e,u),a)),n(r<<f|r>>>32-f,t)}function u(r,t,o,e,u,f,a){return r=n(r,n(n(o^(t|~e),u),a)),n(r<<f|r>>>32-f,t)}function f(r){var n,t="",o="";for(n=0;3>=n;n++)t+=(o="0"+(o=r>>>8*n&255).toString(16)).substr(o.length-2,2);return t}var a,i,C,c,g,h,d,v,S;for(r=function(r){r=r.replace(/\r\n/g,"\n");for(var n="",t=0;t<r.length;t++){var o=r.charCodeAt(t);128>o?n+=String.fromCharCode(o):(127<o&&2048>o?n+=String.fromCharCode(o>>6|192):(n+=String.fromCharCode(o>>12|224),n+=String.fromCharCode(o>>6&63|128)),n+=String.fromCharCode(63&o|128))}return n}(r),a=function(r){for(var n,t=r.length,o=16*(((n=t+8)-n%64)/64+1),e=Array(o-1),u=0,f=0;f<t;)u=f%4*8,e[n=(f-f%4)/4]|=r.charCodeAt(f)<<u,f++;return e[n=(f-f%4)/4]|=128<<f%4*8,e[o-2]=t<<3,e[o-1]=t>>>29,e}(r),h=1732584193,d=4023233417,v=2562383102,S=271733878,r=0;r<a.length;r+=16)i=h,C=d,c=v,g=S,h=t(h,d,v,S,a[r+0],7,3614090360),S=t(S,h,d,v,a[r+1],12,3905402710),v=t(v,S,h,d,a[r+2],17,606105819),d=t(d,v,S,h,a[r+3],22,3250441966),h=t(h,d,v,S,a[r+4],7,4118548399),S=t(S,h,d,v,a[r+5],12,1200080426),v=t(v,S,h,d,a[r+6],17,2821735955),d=t(d,v,S,h,a[r+7],22,4249261313),h=t(h,d,v,S,a[r+8],7,1770035416),S=t(S,h,d,v,a[r+9],12,2336552879),v=t(v,S,h,d,a[r+10],17,4294925233),d=t(d,v,S,h,a[r+11],22,2304563134),h=t(h,d,v,S,a[r+12],7,1804603682),S=t(S,h,d,v,a[r+13],12,4254626195),v=t(v,S,h,d,a[r+14],17,2792965006),h=o(h,d=t(d,v,S,h,a[r+15],22,1236535329),v,S,a[r+1],5,4129170786),S=o(S,h,d,v,a[r+6],9,3225465664),v=o(v,S,h,d,a[r+11],14,643717713),d=o(d,v,S,h,a[r+0],20,3921069994),h=o(h,d,v,S,a[r+5],5,3593408605),S=o(S,h,d,v,a[r+10],9,38016083),v=o(v,S,h,d,a[r+15],14,3634488961),d=o(d,v,S,h,a[r+4],20,3889429448),h=o(h,d,v,S,a[r+9],5,568446438),S=o(S,h,d,v,a[r+14],9,3275163606),v=o(v,S,h,d,a[r+3],14,4107603335),d=o(d,v,S,h,a[r+8],20,1163531501),h=o(h,d,v,S,a[r+13],5,2850285829),S=o(S,h,d,v,a[r+2],9,4243563512),v=o(v,S,h,d,a[r+7],14,1735328473),h=e(h,d=o(d,v,S,h,a[r+12],20,2368359562),v,S,a[r+5],4,4294588738),S=e(S,h,d,v,a[r+8],11,2272392833),v=e(v,S,h,d,a[r+11],16,1839030562),d=e(d,v,S,h,a[r+14],23,4259657740),h=e(h,d,v,S,a[r+1],4,2763975236),S=e(S,h,d,v,a[r+4],11,1272893353),v=e(v,S,h,d,a[r+7],16,4139469664),d=e(d,v,S,h,a[r+10],23,3200236656),h=e(h,d,v,S,a[r+13],4,681279174),S=e(S,h,d,v,a[r+0],11,3936430074),v=e(v,S,h,d,a[r+3],16,3572445317),d=e(d,v,S,h,a[r+6],23,76029189),h=e(h,d,v,S,a[r+9],4,3654602809),S=e(S,h,d,v,a[r+12],11,3873151461),v=e(v,S,h,d,a[r+15],16,530742520),h=u(h,d=e(d,v,S,h,a[r+2],23,3299628645),v,S,a[r+0],6,4096336452),S=u(S,h,d,v,a[r+7],10,1126891415),v=u(v,S,h,d,a[r+14],15,2878612391),d=u(d,v,S,h,a[r+5],21,4237533241),h=u(h,d,v,S,a[r+12],6,1700485571),S=u(S,h,d,v,a[r+3],10,2399980690),v=u(v,S,h,d,a[r+10],15,4293915773),d=u(d,v,S,h,a[r+1],21,2240044497),h=u(h,d,v,S,a[r+8],6,1873313359),S=u(S,h,d,v,a[r+15],10,4264355552),v=u(v,S,h,d,a[r+6],15,2734768916),d=u(d,v,S,h,a[r+13],21,1309151649),h=u(h,d,v,S,a[r+4],6,4149444226),S=u(S,h,d,v,a[r+11],10,3174756917),v=u(v,S,h,d,a[r+2],15,718787259),d=u(d,v,S,h,a[r+9],21,3951481745),h=n(h,i),d=n(d,C),v=n(v,c),S=n(S,g);return(f(h)+f(d)+f(v)+f(S)).toLowerCase()}
