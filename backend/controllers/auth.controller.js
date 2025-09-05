import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";

const generateTokens = (userId) => {  
  //jwt.sign(payload, secret, options)

  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m", // Access token valid for 15 minutes
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d", // Refresh token valid for 7 days
  });

  return { accessToken, refreshToken };
};

// save the refresh token in the Redis database
//redis.set(key, value, "EX", seconds)
const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refreshToken:${userId}`,  
    refreshToken,              
    "EX",                      
    60 * 60 * 24 * 7          
  );
};


// Set cookies for access and refresh tokens
const setCookies = (res, accessToken, refreshToken) => {
  // set access token cookie (15 min expiry)
  res.cookie("accessToken", accessToken, {
    httpOnly: true,                          // prevent access via JS (XSS protection)
    secure: process.env.NODE_ENV === "production", // only use HTTPS in production
    sameSite: "Strict",                      // protect from CSRF
    maxAge: 15 * 60 * 1000,                  // 15 minutes
  });

  // set refresh token cookie (7 days expiry)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,                          
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",                      
    maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 days
  });
};


export const signup = async (req, res) => {
  //input
  const { email, password, name } = req.body;

  //validation
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    //saving user to the database
    const user = await User.create({
      email,
      password,
      name,
    });

    //authentication create 2 type of tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    //save refresh-token in the database
    await storeRefreshToken(user._id, refreshToken);
    //Set cookies
    setCookies(res, accessToken, refreshToken);

    //output
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error in signup Controller:", error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    //input
    const { email, password } = req.body;

    //check if user exists in DB
    const user = await User.findOne({ email });

     // validate password
    if (user && (await user.comparePassword(password))) {
      // authentication: create access & refresh tokens
      const { accessToken, refreshToken } = generateTokens(user._id);
      //save refresh-token in the database
      await storeRefreshToken(user._id, refreshToken);
      // set both tokens in cookies
      setCookies(res, accessToken, refreshToken);

      //output
      res.status(200).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        message: "Login successful",
      });
    } else {
      // invalid credentials
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.log("Error in login Controller:", error);
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // verify and decode refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      //const userId = decode.userId; // Extract userId from the decoded token
      // delete refresh token from Redis
      await redis.del(`refreshToken:${decoded.userId}`);
    }

    // clear both access and refresh token cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // response
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout Controller:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

//recreate access token using refresh token automatically
export const refreshToken = async (req, res) => {
  try {
    // get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;

    // check if refresh token is present
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify the refresh token
    //jwt.verify(token, secret)
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Check if the refresh token exists in Redis
    const storedToken = await redis.get(`refreshToken:${decoded.userId}`);
    if(storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate a new access token
    const accessToken = jwt.sign({ userId: decoded.userId}, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m", // Access token valid for 15 minutes
    });

    // Set the new access token in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // response
    res.status(200).json({message: "Access token refreshed successfully"});
  } catch(error) {
    console.error("Error in refreshToken Controller:", error);
    res.status(500).json({ message: error.message });
  }
}

export const getProfile = async (req, res) => {
  try{
    res.json(req.user); // req.user is populated by protectRoute middleware
  }catch(error) {
    console.error("Error in getProfile Controller:", error);
    res.status(500).json({ message: error.message });
  }
}
