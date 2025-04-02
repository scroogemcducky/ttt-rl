import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle } from 'react-konva';
const API_URL = 'http://ttt-rl-alb-394900440.us-east-1.elb.amazonaws.com/'


const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if(squares[a]== ".") {
      continue
    }
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: lines[i] };
    }
  }
  
  return null;
};

const Board = () => {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({
    width: typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 896) : 800, // 896px is 56rem (max-w-4xl)
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });
  const [boardState, setBoardState] = useState(Array(9).fill("."));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  // const [gameStatus, setGameStatus] = useState('Your turn');
  const [winner, setWinner] = useState(null);

  // Handle window resize and measure container
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Update container size based on the actual measured DOM element
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Calculate dimensions based on container size instead of window size
  const minDimension = Math.min(containerSize.width - 20, windowSize.height * 0.7 - 20, 480);
  const boardSize = minDimension;
  const cellSize = boardSize / 3;
  
  // Add padding to account for shadows
  // const stagePadding = 15;

  // Center the board in the container with padding for shadows
  const boardX = (containerSize.width - boardSize) / 2;
  const boardY = (500 - boardSize) / 2; // Center vertically in the fixed height Stage
  
  const boardColor = 'white';
  const lineColor = '#333333';
  const xColor = '#333333';
  const oColor = '#333333';
  const lineWidth = 0.5;

  const sendMoveToServer = async (index, playerBoardState) => {
    try {
      // setGameStatus('Thinking...');
      
      // Set a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {        
        const response = await fetch(`${API_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            position: index,
            mark: 'X',  // Player is always X
            board: playerBoardState  // Send the board state with player's move already applied
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear the timeout if fetch completes
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        // await new Promise(r => setTimeout(r, 400)); // Slow down :) 
        
        if (data.serverMove !== undefined && data.serverMove !== null) {
          setBoardState(prevBoard => {
            const updatedBoardState = [...prevBoard];
            updatedBoardState[data.serverMove] = 'O';
            
            const winResult = calculateWinner(updatedBoardState);
            if (winResult) {
              // Use setTimeout to avoid state batching issues
              setTimeout(() => {
                setWinner(winResult);
                // setGameStatus(winResult.winner === 'X' ? 'You win!' : 'Computer wins!');
              }, 0);
            } 
            // else if (updatedBoardState.every(cell => cell !== ".")) {
            //   setTimeout(() => setGameStatus('Draw!'), 0);
            // } 
            else {
              setTimeout(() => {
                // setGameStatus('Your turn');
                setIsPlayerTurn(true);
              }, 0);
            }
            
            return updatedBoardState;
          });
        } else {
          // If no server move was provided, still re-enable player turn
          // setGameStatus('Your turn');
          setIsPlayerTurn(true);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Server not responding.');
        } else {
          throw fetchError;
        }
      }
      
    } catch (error) {
      console.error('Error sending move to server:', error);
      // setGameStatus(`Connection error: ${error.message}`);
      setIsPlayerTurn(true); // Allow player to try again
    }
  };

  const handleClick = async (index) => {

    if ((boardState[index] !== ".") || winner || !isPlayerTurn) return;
    setIsPlayerTurn(false);
    
    // let currentBoardAfterPlayerMove;
    
    setBoardState(prevBoard => {
      // Create a new board state with player's X
      const newBoardState = [...prevBoard];
      newBoardState[index] = 'X';
      console.log("newBoardState: ", newBoardState)
      
      // Save a reference to this new state for server call
      // currentBoardAfterPlayerMove = [...newBoardState];
      
      // Check if player's move resulted in a win
      const winResult = calculateWinner(newBoardState);

      if (winResult) {
        setTimeout(() => {
          setWinner(winResult);
          // setGameStatus('You win!');
        }, 0);
      } 
      // else if (newBoardState.every(cell => cell !== ".")) {
      //   setTimeout(() => setGameStatus('Draw!'), 0);
      // }
      
      return newBoardState;
    });
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check win conditions again to prevent unnecessary server call
    const latestBoardState = [...boardState];
    latestBoardState[index] = 'X';
    const winResult = calculateWinner(latestBoardState);
    
    if (winResult || latestBoardState.every(cell => cell !== ".")) {
      return; // Game is over, no need to get server move
    }
    
    // Send move to server with the board that includes player's move
    try {
      await sendMoveToServer(index, latestBoardState);
    } catch (error) {
      console.error('Failed to send move:', error);
      // If server communication fails, still allow the player to continue
      // setIsPlayerTurn(true);
      // setGameStatus('Error: ' + error.message);
    }
  };

  // Draw X mark
  const drawX = (x, y) => {
    const padding = cellSize * 0.2;
    
    return (
      <Group>
        <Line
          points={[
            x + padding, 
            y + padding,
            x + cellSize - padding, 
            y + cellSize - padding
          ]}
          stroke={xColor}
          strokeWidth={lineWidth * 1.5}
          lineCap="round"
        />
        
        <Line
          points={[
            x + cellSize - padding, 
            y + padding,
            x + padding, 
            y + cellSize - padding
          ]}
          stroke={xColor}
          strokeWidth={lineWidth * 1.5}
          lineCap="round"
        />
      </Group>
    );
  };

  // Draw O mark
  const drawO = (x, y) => {
    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2;
    const radius = cellSize * 0.35;
    
    return (
      <Group>
        <Circle
          x={centerX}
          y={centerY}
          radius={radius}
          stroke={oColor}
          strokeWidth={lineWidth * 1.5}
          perfectDrawEnabled={true}
        />
      </Group>
    );
  };

  // Draw board
  const drawBoard = () => {
    return (
      <Group>
        {/* Board background */}
        <Rect
          x={boardX}
          y={boardY}
          width={boardSize}
          height={boardSize}
          fill={boardColor}
          cornerRadius={5}
          shadowColor="rgba(0,0,0,0.2)"
          shadowBlur={10}
          shadowOffset={{ x: 3, y: 3 }}
        />
        
        {/* Grid lines */}
        {[1, 2].map(i => (
          <Line
            key={`v-${i}`}
            points={[
              boardX + i * cellSize,
              boardY,
              boardX + i * cellSize,
              boardY + boardSize
            ]}
            stroke={lineColor}
            strokeWidth={lineWidth}
          />
        ))}
        
        {[1, 2].map(i => (
          <Line
            key={`h-${i}`}
            points={[
              boardX,
              boardY + i * cellSize,
              boardX + boardSize,
              boardY + i * cellSize
            ]}
            stroke={lineColor}
            strokeWidth={lineWidth}
          />
        ))}
        
        {/* Game pieces - X's and O's */}
        {boardState.map((cell, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const x = boardX + col * cellSize;
          const y = boardY + row * cellSize;
          
          // console.log(`Cell ${index}: ${cell}`); // Debug output
          
          if (cell === 'X') {
            return (
              <Group key={`mark-${index}`}>
                {drawX(x, y)}
              </Group>
            );
          } else if (cell === 'O') {
            return (
              <Group key={`mark-${index}`}>
                {drawO(x, y)}
              </Group>
            );
          }
          return null;
        })}
        
        {/* Highlight winning line */}
        {winner && (
          <Line
            key="winning-line"
            points={winner.line.flatMap(index => {
              const row = Math.floor(index / 3);
              const col = index % 3;
              return [
                boardX + (col + 0.5) * cellSize,
                boardY + (row + 0.5) * cellSize
              ];
            })}
            stroke="#2ecc71"
            strokeWidth={lineWidth * 2}
            opacity={0.7}
            lineCap="round"
          />
        )}
        
        {/* Click handlers for each cell */}
        {Array(9).fill(".").map((_, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          
          return (
            <Rect
              key={`cell-${index}`}
              x={boardX + col * cellSize}
              y={boardY + row * cellSize}
              width={cellSize}
              height={cellSize}
              fill="transparent"
              onClick={() => handleClick(index)}
              onTap={() => handleClick(index)}
            />
          );
        })}
        
        {/* Game status */}
        {/* <Group key="status-group">
          <Rect
            x={boardX}
            y={boardY - 60}
            width={boardSize}
            height={40}
            fill="transparent"
          />
          <Text
            x={boardX}
            y={boardY - 60}
            width={boardSize}
            height={40}
            text={gameStatus}
            fontSize={20}
            fontFamily="Arial, sans-serif"
            fill="#555"
            align="center"
            verticalAlign="middle"
          />
        </Group> */}
      </Group>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-[530px]">
      <Stage 
        width={containerSize.width} 
        height={containerSize.width}
        style={{ 
          
          boxSizing: 'border-box' 
        }}
      >
        <Layer>
          {drawBoard()}
        </Layer>
      </Stage>
    </div>
  );
};

export default Board;