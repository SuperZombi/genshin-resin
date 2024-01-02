import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import datetime
import time
from models import *
from tools import *

app = FastAPI(title="Genshin Resin API",
    description="Adds information about original resin to hoyolab",
    version="2.1.0",
    contact={
        "name": "GitHub",
        "url": "https://github.com/SuperZombi/genshin-resin-api"
    })

app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"],allow_credentials=True)


@app.get("/", response_class=HTMLResponse, tags=["Routes"])
def home():
    return "<a href='https://github.com/SuperZombi/genshin-resin-api' style='text-align: center; display: block; font-size: 14pt;'>GitHub</a>"

@app.get("/status", response_model=Status, tags=["Routes"])
def status():
    return {"online": True, "time": int(time.time()), "version": app.version}


@app.get("/getUserRegions", response_model=GetUserRegions,
    tags=["Routes"],
    description="Get information about user servers",
    responses={424: Argument_Incorrect}
)
async def get_User_Regions(ltuid: int, ltoken: str):
    try:
        client = login(ltuid, ltoken)
        accounts = await get_accounts(client)
        user_regions = set(filter(lambda x: x,
            map(lambda x: GenshinServer(x.server).name if x.server in GenshinServer._value2member_map_.keys() else None
            , accounts)
        ))
        return {"user_regions": user_regions}
    except:
        raise HTTPException(status_code=424, detail="Argument values are incorrect")


@app.get("/getOriginalResin", response_model=GetOriginalResin,
    tags=["Routes"],
    description="Get information about user original resin",
    responses={424: Argument_Incorrect}
)
async def get_Original_Resin(ltuid: int, ltmid: str, ltoken: str, prefer_region: str = None):
    try:
        client = login(ltuid, ltoken, ltmid)
        accounts = await get_accounts(client)
        account = get_account(accounts, prefer_region)
        account_info = get_account_info(account, accounts)

        notes = await client.get_notes(account.uid)
        next_recover = notes.remaining_resin_recovery_time.total_seconds() % 480

        return account_info | {
            "current_resin": notes.current_resin,
            "max_resin": notes.max_resin,
            "next_recover": next_recover,
            "next_recover_str": str(datetime.timedelta(seconds=next_recover)),
            "full_recover": notes.remaining_resin_recovery_time.total_seconds(),
            "full_recover_str": str(notes.remaining_resin_recovery_time)
        }
    except:
        raise HTTPException(status_code=424, detail="Argument values are incorrect")


@app.get("/getRealmCurrency", response_model=GetRealmCurrency,
    tags=["Routes"],
    description="Get information about user realm currency",
    responses={424: Argument_Incorrect}
)
async def get_Realm_Currency(ltuid: int, ltmid: str, ltoken: str, prefer_region: str = None):
    try:
        client = login(ltuid, ltoken, ltmid)
        accounts = await get_accounts(client)
        account = get_account(accounts, prefer_region)
        account_info = get_account_info(account, accounts)

        notes = await client.get_notes(account.uid)

        return account_info | {
            "current_realm": notes.current_realm_currency,
            "max_realm": notes.max_realm_currency,
            "full_recover": notes.remaining_realm_currency_recovery_time.total_seconds(),
            "full_recover_str": format_timedelta(notes.remaining_realm_currency_recovery_time)
        }
    except:
        raise HTTPException(status_code=424, detail="Argument values are incorrect")


if __name__ == "__main__":
    uvicorn.run("__main__:app", host="0.0.0.0", port=80)
