from fastapi import Depends

class User:
    username: str = "analyst"

async def get_current_user() -> User:
    return User()
