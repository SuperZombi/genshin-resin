import genshin
import datetime
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
import time

# pip install Flask[async]

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

@app.route("/")
@app.route("/status", methods=['GET'])
def status():
    return jsonify({"online": True, "time": time.time()})

@app.route("/getOriginalResin", methods=['GET'])
async def getOriginalResin():
    ltuid = request.args.get("ltuid")
    ltoken = request.args.get("ltoken")

    if ltuid and ltoken:
        try:
            cookies = {"ltuid": ltuid, "ltoken": ltoken}
            client = genshin.Client(cookies)

            accounts = await client.get_game_accounts()
            account = accounts[0]
            uid = account.uid

            notes = await client.get_notes(uid)
            next_recover = notes.remaining_resin_recovery_time.seconds % 480

            return jsonify({
                "nickname": account.nickname,
                "uid": account.uid,
                "current_resin": notes.current_resin,
                "max_resin": 160,
                "next_recover": next_recover,
                "next_recover_str": str(datetime.timedelta(seconds=next_recover)),
                "full_recover": notes.remaining_resin_recovery_time.seconds,
                "full_recover_str": str(notes.remaining_resin_recovery_time),
            })
        except:
            abort(424)
    abort(400)

if __name__ == '__main__':
    # app.run(debug=True)
    app.run(host='0.0.0.0', port='80')
