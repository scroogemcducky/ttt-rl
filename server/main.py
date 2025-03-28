from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from inference import TicTacToeNN, play_turn
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only - restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

weights_file = 'ttt_weights.bin'
nn = TicTacToeNN()
nn.load_weights(weights_file)

# Create a model for the move data
class Move(BaseModel):
    position: int
    mark: str
    board: list = []  # Optional current board state

@app.get("/")
async def root():
    return {"board": [0, 1]}

@app.post("/")
async def make_move(move: Move):
    board = move.board
    move = play_turn(nn, board)
    return {"serverMove": move}
