import axios from 'axios';

async function testWa() {
    const timespanelApiKey = 'dfd7f23906c83fe01e86b4befe180acdbc03dea0769cee3717';
    const timespanelBaseUrl = 'https://asyncmsg.integration.timespanel.in/wa/v1/messages/send';
    const timespanelSenderNumber = '919217640062';
    const to = '918588910062'; // Admin number as test
    const receiptUrl = 'https://res.cloudinary.com/demo/image/upload/v1570979139/receipts/receipt.pdf';
    
    const payload = {
        messaging_product: "whatsapp",
        message_id: `MSG-${Date.now()}`,
        recipient_type: "individual",
        from: timespanelSenderNumber,
        to: to,
        type: "template",
        template: {
            name: "receiptv4",
            language: {
                code: "en"
            },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: "Test Name" },
                        { type: "text", text: "100 Rs" },
                        { type: "text", text: "General Donation" },
                        { type: "text", text: "Test Name" },
                        { type: "text", text: "General Donation" },
                        { type: "text", text: "100 Rs" }
                    ]
                },
                {
                    type: "header",
                    parameters: [
                        {
                            type: "document",
                            document: {
                                link: receiptUrl,
                                filename: "receipt.pdf"
                            }
                        }
                    ]
                }
            ]
        }
    };

    console.log("Sending payload...");
    try {
        const response = await axios.post(timespanelBaseUrl, payload, {
            headers: {
                'Authorization': timespanelApiKey,
                'Content-Type': 'application/json'
            }
        });
        console.log("Response:", response.status, response.data);
    } catch (error: any) {
        console.error("Error:", error.response?.status, error.response?.data || error.message);
    }
}

testWa();
