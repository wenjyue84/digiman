import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startTour = () => {
    const driverObj = driver({
        showProgress: true,
        steps: [
            {
                element: "#nav-dashboard",
                popover: {
                    title: "Welcome to PelangiManager!",
                    description: "This is your starting point. The Dashboard gives you a quick overview of today's occupancy and tasks.",
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: "#nav-settings",
                popover: {
                    title: "Setup Your Chatbot",
                    description: "Head over to Settings to configure your Rainbow AI chatbot.",
                    side: "bottom",
                    align: "start",
                },
            },
            // We can't navigate automatically unless we are on the page, so for simplicity we will just point to the navigation item.
            // But for a better experience, we can guide them to click it.
            {
                element: "#nav-settings",
                popover: {
                    title: "Connect WhatsApp",
                    description: "Inside Settings -> Chatbot tab, scan the QR code to connect your WhatsApp number.",
                    side: "right",
                    align: "start"
                }
            },
            {
                element: "#nav-settings",
                popover: {
                    title: "Train Your Chatbot",
                    description: "Also in the Chatbot tab, add Q&A pairs to teach the AI about your hostel.",
                    side: "right",
                    align: "start"
                }
            },
            {
                element: "#nav-settings",
                popover: {
                    title: "Test It Out",
                    description: "Use the 'Test Chatbot' feature in the Chatbot tab to see how it responds before going live.",
                    side: "right",
                    align: "start"
                }
            },
            {
                element: "#nav-intent-manager",
                popover: {
                    title: "Monitor Conversations",
                    description: "Use the Intent Manager to see live conversations and intervene if necessary.",
                    side: "right",
                    align: "start"
                }
            },
            {
                element: "#nav-help",
                popover: {
                    title: "Need Help?",
                    description: "Click here anytime to view the full User Guide and Developer Documentation.",
                    side: "top",
                    align: "start",
                },
            },
        ],
    });

    driverObj.drive();
};
