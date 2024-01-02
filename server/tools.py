import genshin
from models import GenshinServer

def login(ltuid, ltoken, ltmid=""):
    cookies = {
        "ltuid": ltuid,
        "ltoken": ltoken,
        "ltmid": ltmid,
        "ltuid_v2": ltuid,
        "ltoken_v2": ltoken,
        "ltmid_v2": ltmid
    }
    return genshin.Client(cookies)

async def get_accounts(client):
    accounts = await client.get_game_accounts()
    return list(filter(lambda x: x.game_biz.startswith("hk4e"), accounts))

def get_account(accounts, prefer_region=None):
    accounts = list(filter(lambda x: x.game_biz.startswith("hk4e"), accounts))

    if prefer_region and prefer_region in GenshinServer._member_names_:
        target_server = GenshinServer[prefer_region].value
        filtered_accounts = list(filter(lambda x: x.server == target_server, accounts))
        if len(filtered_accounts) > 0:
            return filtered_accounts[0]
    return accounts[0]

def get_account_info(account, accounts):
    current_region = GenshinServer(account.server).name
    user_regions = set(filter(lambda x: x,
        map(lambda x: GenshinServer(x.server).name if x.server in GenshinServer._value2member_map_.keys() else None
        , accounts)
    ))
    return {
        "nickname": account.nickname,
        "uid": account.uid,
        "current_region": current_region,
        "user_regions": user_regions
    }

def format_timedelta(td):
    minutes, seconds = divmod(td.seconds + td.days * 86400, 60)
    hours, minutes = divmod(minutes, 60)
    return '{:d}:{:02d}:{:02d}'.format(hours, minutes, seconds)
