import numpy as np
import struct
import sys

# Neural network parameters from C code
NN_INPUT_SIZE = 18
NN_HIDDEN_SIZE = 100
NN_OUTPUT_SIZE = 9

class TicTacToeNN:
    
    def __init__(self):
        self.weights_ih = np.zeros((NN_INPUT_SIZE, NN_HIDDEN_SIZE))
        self.weights_ho = np.zeros((NN_HIDDEN_SIZE, NN_OUTPUT_SIZE))
        self.biases_h = np.zeros(NN_HIDDEN_SIZE)
        self.biases_o = np.zeros(NN_OUTPUT_SIZE)
    
    def load_weights(self, filename):
        """Load weights from binary file saved by C program."""
        with open(f'{filename}', 'rb') as f:
            # Read weights_ih
            weights_ih_raw = f.read(NN_INPUT_SIZE * NN_HIDDEN_SIZE * 4)  # 4 bytes per float
            weights_ih_flat = struct.unpack(f'{NN_INPUT_SIZE * NN_HIDDEN_SIZE}f', weights_ih_raw)
            self.weights_ih = np.array(weights_ih_flat).reshape((NN_INPUT_SIZE, NN_HIDDEN_SIZE))
            
            # Read weights_ho
            weights_ho_raw = f.read(NN_HIDDEN_SIZE * NN_OUTPUT_SIZE * 4)
            weights_ho_flat = struct.unpack(f'{NN_HIDDEN_SIZE * NN_OUTPUT_SIZE}f', weights_ho_raw)
            self.weights_ho = np.array(weights_ho_flat).reshape((NN_HIDDEN_SIZE, NN_OUTPUT_SIZE))
            
            # Read biases_h
            biases_h_raw = f.read(NN_HIDDEN_SIZE * 4)
            self.biases_h = np.array(struct.unpack(f'{NN_HIDDEN_SIZE}f', biases_h_raw))
            
            # Read biases_o
            biases_o_raw = f.read(NN_OUTPUT_SIZE * 4)
            self.biases_o = np.array(struct.unpack(f'{NN_OUTPUT_SIZE}f', biases_o_raw))
        
        print(f"Weights loaded from ../{filename}")
    
    def relu(self, x):
        """ReLU activation function."""
        return np.maximum(0, x)
    
    def softmax(self, x):
        """Softmax activation function."""

        x_max = np.max(x) # for numerical stability subtract max
        exp_x = np.exp(x - x_max)
        return exp_x / np.sum(exp_x)
    
    def forward(self, inputs):
        """Forward pass through the neural network."""
        # Input to hidden layer
        hidden = self.relu(np.dot(inputs, self.weights_ih) + self.biases_h)
        
        # Hidden to output layer
        raw_output = np.dot(hidden, self.weights_ho) + self.biases_o
        
        # Apply softmax
        output = self.softmax(raw_output)
        
        return output

    def board_to_inputs(self, board):
        """Convert board state to neural network inputs.
        Uses same encoding as the C code:
        - Empty cell: [0, 0]
        - X: [1, 0]
        - O: [0, 1]
        """
        inputs = np.zeros(NN_INPUT_SIZE)
        
        for i in range(9):
            if board[i] == '.':
                inputs[i*2] = 0
                inputs[i*2+1] = 0
            elif board[i] == 'X':
                inputs[i*2] = 1
                inputs[i*2+1] = 0
            else:  # 'O'
                inputs[i*2] = 0
                inputs[i*2+1] = 1
        
        return inputs
    
    def get_best_move(self, board):
        """Get the best move for the current board state."""
        inputs = self.board_to_inputs(board)
        outputs = self.forward(inputs)
        
        # Find the best legal move
        best_move = -1
        best_prob = -1

        # TODO this is ugly, just get best move argmax?
        for i in range(9):
            if board[i] == '.' and (best_move == -1 or outputs[i] > best_prob):
                best_move = i
                best_prob = outputs[i]
        
        return best_move


def play_turn(nn, board):
    move = nn.get_best_move(board)
    print(f'move is: {move}')
    return move


def main():
    # make weights file an argument for choosing the nn 
    weights_file = 'ttt_weights.bin'
    
    # Initialize neural network
    board = ['.' for i in range(9)]
   
    nn = TicTacToeNN()
    nn.load_weights(weights_file)
    
    play_turn(nn, board)
    

if __name__ == "__main__":
    main()