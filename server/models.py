from pydantic import BaseModel
from enum import Enum
import datetime

class Status(BaseModel):
    online: bool
    time: int
    version: str

class GenshinServer(Enum):
    US = "os_usa"
    EU = "os_euro"
    AS = "os_asia"
    TW = "os_cht"

Argument_Incorrect = {
    "description": "Argument values are incorrect",
    "content": {
        "application/json": {
            "example": {"detail": "Argument values are incorrect"}
        }
    }
}


class GetUserRegions(BaseModel):
    user_regions: list


class GetOriginalResin(BaseModel):
    nickname: str
    uid: int
    current_region: str
    user_regions: list
    current_resin: int = 0
    max_resin: int = 160
    next_recover: int = 480
    next_recover_str: str = str(datetime.timedelta(seconds=480))
    full_recover: int = 76800
    full_recover_str: str = str(datetime.timedelta(seconds=76800))


class GetRealmCurrency(BaseModel):
    nickname: str
    uid: int
    current_region: str
    user_regions: list
    current_realm: int = 0
    max_realm: int = 2400
    full_recover: int
    full_recover_str: str
