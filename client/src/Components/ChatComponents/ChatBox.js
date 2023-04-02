import React, { useEffect, useState } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { IoCaretBackCircle } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import io from "socket.io-client";

import ProfileModal from "../SubComponents/Models/ProfileModal";
import GroupDetailModel from "../SubComponents/Models/ChatDetailModal";

import ScrollableChat from "./ScrollableChat";
import TypingAnimation from "../SubComponents/Animations/TypingAnimation";
import LoadingMessageAnimation from "../SubComponents/Animations/LoadingMessageAnimation";

import { fetchAllMessages, sendMessage } from "../../Redux/Actions/Message";
import { changeSelectedChat } from "../../Redux/Actions/Chat";
import { getSender, getSenderFull } from "../../Config/ChatLogics";
import { addNotification } from "../../Redux/Actions/User";


const ENDPOINT = process.env.REACT_APP_BACKEND_LINK;
var socket, selectedChatCompare;

const ChatBox = () => {
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [disableTextField, setDisableTextField] = useState(false);

    const dispatch = useDispatch();

    const { user, notifications } = useSelector((state) => state.user);
    const { selectedChat, loading } = useSelector((state) => state.chat);
    const { allMessages } = useSelector((state) => state.message);

    // socket initiallization
    useEffect(() => {
        socket = io(ENDPOINT);
    
        // create socket for specific user
        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));

        // typing handler
        socket.on("typing", () => setIsTyping(true));
        socket.on("stop typing", () => setIsTyping(false));

    }, [user]);
    
    
    useEffect(() => {
        const fetchData = async () => {
            await dispatch(fetchAllMessages(selectedChat?._id));
            socket.emit("join chat", selectedChat._id);
    
            selectedChatCompare = selectedChat;
        }
        fetchData();
    }, [messages, dispatch]);

    useEffect(() => {
        selectedChatCompare = selectedChat;
    }, [selectedChat]);
    
    

    const handleClick = () => {
        dispatch(changeSelectedChat(null));
    };
    const sendMessageToUser = async (e) => {
        if(e.key === "Enter" && newMessage) {
            setDisableTextField(true);
            socket.emit("stop typing", selectedChat._id);

            setNewMessage("");
            const data = await dispatch(sendMessage(newMessage, selectedChat._id));
            setMessages([...messages, newMessage]);

            // sent msg fetch from store and sent to server
            socket.emit("new message", data.message)
            setDisableTextField(false);
        }
    };
    const typingHandler = (e) => {
        setNewMessage(e.target.value);
        
        // typing indicator logic
        if (!socketConnected) return;

        if (!typing) {
            setTyping(true);
            socket.emit("typing", selectedChat._id);
        }

        // debouncing like function which emits stop typing after 3 sec of stop typing
        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;
        setTimeout(() => {
        var timeNow = new Date().getTime();
        var timeDiff = timeNow - lastTypingTime;
        if (timeDiff >= timerLength && typing) {
            socket.emit("stop typing", selectedChat._id);
            setTyping(false);
        }
        }, timerLength);

    };
    

    
    useEffect(() => {
        socket.on("message recieved", (newMessageReceived) => {
            // if chat is not selected or doesn't match current chat
            if (
                selectedChatCompare === null || 
                selectedChatCompare._id !== newMessageReceived.chat._id
            ) {
                // give notification
                // console.log(newMessageReceived);
                // console.log(notifications);

                // const isIncluded = notifications?.find((noti) => noti?.chat?._id === newMessageReceived?.chat?._id) ? true : false;
                // console.log(isIncluded);

                console.log(notifications.includes(newMessageReceived));
                // console.log(notifications.find((newMessageReceived) => newMessageReceived.chat._id === notifications.chat._id));
                
                if (!notifications.includes(newMessageReceived)) {
                // if (!isIncluded) {
                    dispatch(addNotification([...notifications, newMessageReceived]))
                    // setNotifications([newMessageReceived, ...notifications]);
                }
            } else {
                setMessages([...messages, newMessageReceived]);
            }
        })
    })


    return (
        <Box
            sx={{
                width: 500,
                height: 500,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    textAlign: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
                px={5}
                py={1}
            >
                <IconButton
                    color="secondary"
                    aria-label="add an alarm"
                    style={{ fontWeight: 600, fontSize: 35 }}
                    sx={{ letterSpacing: 1.5 }}
                    onClick={handleClick}
                >
                    <IoCaretBackCircle />
                </IconButton>

                <Box sx={{ fontSize: 25, fontWeight: 700, color: "#686de0" }}>
                    {selectedChat !== null && !selectedChat?.isGroupChat
                        ? getSender(user, selectedChat?.users)
                        : selectedChat?.chatName}
                </Box>

                {selectedChat !== null && !selectedChat?.isGroupChat && (
                    <ProfileModal user={getSenderFull(user, selectedChat?.users)} >
                        <IconButton
                            color="secondary"
                            style={{ fontWeight: 600, fontSize: 30 }}
                            sx={{ letterSpacing: 1.5 }}
                        >
                            <FaEye />
                        </IconButton>
                    </ProfileModal>
                )}
                {selectedChat !== null && selectedChat?.isGroupChat && (
                    <GroupDetailModel user={selectedChat?.users}>
                        <IconButton
                            color="secondary"
                            style={{ fontWeight: 600, fontSize: 30 }}
                            sx={{ letterSpacing: 1.5 }}
                        >
                            <FaEye />
                        </IconButton>
                    </GroupDetailModel>
                )}
            </Box>
            <Box
                sx={{
                    height: "100%",
                    width: "100%",
                    background: "#efefef",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    overflowY: "hidden",
                    gap: 2,
                }}
                p={3}
            >
                <Box sx={{ height: "100%", overflowY: "scroll" }}>
                    {
                        loading ? <LoadingMessageAnimation /> : <ScrollableChat messages={allMessages} />
                    }
                </Box>
                <Box >
                    {isTyping ? <TypingAnimation /> : <></>}
                    
                    <TextField
                        className="inputRounded"
                        color="secondary"
                        name="newMessage"
                        value={newMessage}
                        fullWidth
                        autoFocus
                        autoComplete="off"
                        placeholder="Enter Message and click Enter"
                        id="newMessage"
                        onChange={typingHandler}
                        onKeyDown={sendMessageToUser}
                        disabled={disableTextField}
                        style={{ opacity: disableTextField ? 0 : 1 }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default ChatBox;