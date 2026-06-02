class CurrentUser:
    username = "analyst"

async def get_current_user():
    return CurrentUser()
