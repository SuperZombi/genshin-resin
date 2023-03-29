import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import genshin
import datetime
import time

app = FastAPI(title="Genshin Resin API",
    description="Adds information about original resin to hoyolab",
    version="1.0.0",
    contact={
        "name": "GitHub",
        "url": "https://github.com/SuperZombi/genshin-resin-api"
    })

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/", response_class=HTMLResponse, tags=["Routes"])
def home():
    return "<a href='https://github.com/SuperZombi/genshin-resin-api' style='text-align: center; display: block; font-size: 14pt;'>GitHub</a>"


class Status(BaseModel):
    online: bool
    time: int = int(time.time())

@app.get("/status", response_model=Status, tags=["Routes"])
def status():
    return {"online": True, "time": int(time.time())}


class GetOriginalResin(BaseModel):
    nickname: str
    uid: int
    current_resin: int = 0
    max_resin: int = 160
    next_recover: int = 480
    next_recover_str: str = str(datetime.timedelta(seconds=480))
    full_recover: int = 76800
    full_recover_str: str = str(datetime.timedelta(seconds=76800))
    
@app.get("/getOriginalResin", response_model=GetOriginalResin,
    tags=["Routes"],
    description="Get information about user original resin",
    responses={
        424: {
            "description": "Argument values are incorrect",
            "content": {
                "application/json": {
                    "example": {"detail": "Argument values are incorrect"}
                }
            }
        }
    }
)
async def get_Original_Resin(ltuid: int, ltoken: str):
    try:
        cookies = {"ltuid": ltuid, "ltoken": ltoken}
        client = genshin.Client(cookies)

        accounts = await client.get_game_accounts()
        account = accounts[0]
        uid = account.uid

        notes = await client.get_notes(uid)
        next_recover = notes.remaining_resin_recovery_time.seconds % 480

        return {
            "nickname": account.nickname,
            "uid": account.uid,
            "current_resin": notes.current_resin,
            "max_resin": 160,
            "next_recover": next_recover,
            "next_recover_str": str(datetime.timedelta(seconds=next_recover)),
            "full_recover": notes.remaining_resin_recovery_time.seconds,
            "full_recover_str": str(notes.remaining_resin_recovery_time)
        }
    except:
        raise HTTPException(status_code=424, detail="Argument values are incorrect")


if __name__ == "__main__":
    uvicorn.run("__main__:app", host="0.0.0.0", port=80)
