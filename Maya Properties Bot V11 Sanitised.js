// Maya Properties Bot Fulfillment Code
// Intents & Mapped Functions: 
//      1. Make Appt => MakeAppt  
//      2. Leave Comment => LeaveComment
//      3. Failure Appt => MakeAppt
//      4. Check Schedule => CheckSchedule
//      5. Delete Appt => DeleteAppt
//      6. Confirm Delete => ConfirmDelete
//      7. Home Value => HomeValue 
// Configuration Needed for [1] to [7] Below

'use strict';

const functions = require('firebase-functions');
const { google } = require('googleapis');
const { WebhookClient } = require('dialogflow-fulfillment');
process.env.DEBUG = "dialogflow:debug";

// General Configuration
const AgentName = 'Maya'; // Change Agent Name as needed [1]
const AgentEmail = 'xxx@gmail.com'; // Agent Receive Mailbox Address [2]
const ChatbotEmail = 'xxx@gmail.com'; // Chatbot Send Gmail Address [3]

// Nodemailer Configuration 
// Add "nodemailer": "^4.6.7" dependency at package.json 
const nodemailer = require('nodemailer');
const mailTransport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: '465',
    secure: 'true',
    service: 'Gmail',
    auth: {
        user: ChatbotEmail,
        pass: 'xxx' // Password of Chatbot Gmail (Set Less Secure) [4]
    }
});

// Google Calendar Configuration
const CalendarId = 'xxx@group.calendar.google.com'; //Enter CalendarId Here [5]
// JSON File downloaded from Google Calendar Service Acct create credentials
// Starting with "type": "service_account"... 
const serviceAccount = {
    "type": "service_account", "...": "..."
};
const serviceAccountAuth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: 'https://www.googleapis.com/auth/calendar'
});
const calendar = google.calendar('v3');

// Axios API Call & SheetDB (Google Calendar) Configuration
// Add "axios": "^0.21.0" dependency at package.json
const axios = require('axios');
const EntryDBPath = 'https://sheetdb.io/api/v1/xxx'; // SheetDB Generated API [7]

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });

    function HomeValue(agent) {
        const Locality = agent.parameters.Locality;
        const Tenure = agent.parameters.Tenure;
        const Property = agent.parameters.Property;
        const AreaType = agent.parameters.AreaType;
        const Size = agent.parameters.Size;
        const LRModel = {
            "Locality": {
                "Ang Mo Kio": -93256244214866.8,
                "Bedok": -93256244214820.8,
                "Bishan": -93256244214474.9,
                "Bukit Batok": -93256244214893,
                "Bukit Merah": -93256244214247,
                "Bukit Panjang": -93256244214912.4,
                "Bukit Timah": -93256244214361.7,
                "Changi": -93256244214955.6,
                "Choa Chu Kang": -93256244215133,
                "Clementi": -93256244214704.3,
                "Downtown": -93256244213747.2,
                "Geylang": -93256244214619,
                "Hougang": -93256244214845.5,
                "Jurong East": -93256244214946.3,
                "Jurong West": -93256244215007.8,
                "Kallang": -93256244214612.7,
                "Mandai": -93256244215219.3,
                "Marine Parade": -93256244214246.9,
                "Museum": -93256244213846.2,
                "Newton": -93256244213657.5,
                "Novena": -93256244214351,
                "Orchard": -93256244212830.9,
                "Outram": -93256244213866.2,
                "Pasir Ris": -93256244215010.4,
                "Punggol": -93256244214811.9,
                "Queenstown": -93256244214377.8,
                "River Valley": -93256244213489.2,
                "Rochor": -93256244214367.3,
                "Sembawang": -93256244214860.8,
                "Sengkang": -93256244214797.6,
                "Serangoon": -93256244214684.4,
                "Singapore River": -93256244214058.7,
                "Southern Islands": -93256244214429,
                "Sungei Kadut": -93256244215189,
                "Tampines": -93256244214775.7,
                "Tanglin": -93256244214100.8,
                "Toa Payoh": -93256244214420.9,
                "Woodlands": -93256244215106.6,
                "Yishun": -93256244214993.6
            },
            "Tenure": {
                "Freehold": 1281566521830990,
                "Leasehold": 1281566521830980
            },
            "Property": {
                "Apartment": 928522351986515,
                "Condominium": 928522351986370,
                "Detached House": 928522351985630,
                "Executive Condominium": 928522351986172,
                "Semi-Detached House": 928522351985687,
                "Terrace House": 928522351985876
            },
            "AreaType": {
                "Land": -361423160876231,
                "Strata": -361423160876819
            },
            "intercept": -1755409468724530
        };
        const HomeValuePSF = LRModel.Locality[Locality] +
            LRModel.Tenure[Tenure] + LRModel.Property[Property] +
            LRModel.AreaType[AreaType] + LRModel.intercept;
        const HomeValue = '$' + parseInt(HomeValuePSF * Size).toLocaleString("en-US");
        agent.add(`The estimated value of the home is ${HomeValue}. ` +
            `It is derived from a Linear Regression Model based on historical data. For more information on how this estimate is derived, you can check out Ask FAQ. ` +
            `You can make appointment with the consultant, go start or end call`);
    }

    function MakeAppt(agent) {
        const CustName = agent.parameters.CustName;
        const CustEmail = agent.parameters.CustEmail;
        const CustMobile = agent.parameters.CustMobile;
        const CustComment = 'NIL';
        const ApptDate = agent.parameters.ApptDate.split('T')[0];
        const ApptTime = agent.parameters.ApptTime.split('T')[1].substr(0, 14);
        const dateTimeStart = new Date(ApptDate + 'T' + ApptTime);
        const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 1));
        const appointment_type = CustName + ' ' + CustMobile + ' ' + CustEmail;
        const ApptDateFormat = ApptDate.split('-').reverse().join('-');
        const ApptTimeFormat = ApptTime.substr(0, 5);

        // Email Notification to Customer    
        const EmailSubject1 = 'Appointment Confirmation from Maya Properties Bot';
        const EmailBody1 = 'Dear ' + CustName +
            '<p> Thank you for using Maya Properties.' +
            '<p> The appointment is confirmed as follows：' +
            '<p><strong> Customer Name: </strong>' + CustName +
            '<br><strong> Appointment Date & Time: </strong>' + ApptDateFormat + ' ' + ApptTimeFormat +
            '<br><strong> Consultant Name: </strong>' + AgentName +
            '<p> The consultant will be contacting you shortly on the details of the appointment.' +
            '<p> Have a nice day!' +
            '<p> From: Maya Properties Bot';

        // Email Notification to Consultant  
        const EmailSubject2 = 'Appointment Confirmation from Maya Properties Bot';
        const EmailBody2 = 'Dear ' + AgentName +
            '<p> There is a new customer appointment from Maya Properties Bot.' +
            '<p> The appointment is confirmed as follows：' +
            '<p><strong> Customer Name: </strong>' + CustName +
            '<br><strong> Customer Mobile: </strong>' + CustMobile +
            '<br><strong> Customer Email: </strong>' + CustEmail +
            '<br><strong> Consultant Name: </strong>' + AgentName +
            '<br><strong> Appointment Date & Time: </strong>' + ApptDateFormat + ' ' + ApptTimeFormat +
            '<p> Please contact the customer quickly on the details of the appointment.' +
            '<p> Have a nice day!' +
            '<p> From: Maya Properties Bot';

        // Check the time availibility and make appointment
        return createCalendarEvent(dateTimeStart, dateTimeEnd, appointment_type).then((calendarResponse) => {
            sendEmail(CustEmail, EmailSubject1, EmailBody1);
            sendEmail(AgentEmail, EmailSubject2, EmailBody2);
            const EventId = calendarResponse.data.id;
            agent.context.set({
                'name': 'MakeAppt-followup',
                'lifespan': 2,
                'parameters': {
                    'EventId': EventId,
                    'CalendarId': CalendarId
                }
            });
            CreateDBEntry(AgentName, ApptDateFormat, ApptTimeFormat, CustName, CustMobile, CustEmail, CustComment, EventId);
            agent.add(`The appointment with consultant ${AgentName} on ${ApptDateFormat} at ${ApptTimeFormat} has been confirmed. ` +
                `The consultant will be contacting you shortly on the details of the appointment. Would you like to leave a comment for the consultant? ` +
                `If no, you can end call`);
        }).catch(() => {
            agent.add(`I'm sorry, there are no slots available for ${AgentName} on ${ApptDate} at ${ApptTimeFormat}`);
            agent.setFollowupEvent('FailureAppt');
        });
    }

    function createCalendarEvent(dateTimeStart, dateTimeEnd, appointment_type) {
        return new Promise((resolve, reject) => {
            calendar.events.list({
                auth: serviceAccountAuth,
                calendarId: CalendarId,
                timeMin: dateTimeStart.toISOString(),
                timeMax: dateTimeEnd.toISOString()
            }, (err, calendarResponse) => {
                if (err || calendarResponse.data.items.length > 0) {
                    reject(err || new Error('Requested time conflicts with another appointment'));
                } else {
                    // Create event for requested time period
                    calendar.events.insert({
                        auth: serviceAccountAuth,
                        calendarId: CalendarId,
                        resource: {
                            summary: appointment_type + ' Appointment', description: appointment_type,
                            start: { dateTime: dateTimeStart },
                            end: { dateTime: dateTimeEnd }
                        }
                    }, (err, event) => {
                        if (err) {
                            console.log('There is error: ' + err);
                            reject(err);
                        }
                        else {
                            console.log('Event created EventID: ' + event.data.id);
                            resolve(event);
                        }
                    }
                    );
                }
            });
        });
    }

    function sendEmail(RecipientEmail, EmailSubject, EmailBody) {
        const mailOptions = {
            from: ChatbotEmail,
            to: RecipientEmail
        };
        mailOptions.subject = EmailSubject;
        mailOptions.html = EmailBody;
        return mailTransport.sendMail(mailOptions).then(() => {
            return console.log('Email sent to:', RecipientEmail);
        });
    }

    function GetDBData(DBPath) {
        return new Promise((resolve, reject) => {
            axios.get(DBPath).then(
                (response) => {
                    var result = response.data;
                    console.log('Processing Request');
                    resolve(result);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    function CreateDBEntry(AgentName, ApptDate, ApptTime, CustName, CustMobile, CustEmail, CustComment, EventId) {
        axios.post(EntryDBPath, {
            "data": {
                "AgentName": AgentName,
                "ApptDate": ApptDate,
                "ApptTime": ApptTime,
                "CustName": CustName,
                "CustMobile": CustMobile,
                "CustEmail": CustEmail,
                "TimeStampC": new Date(),
                "Status": "ACTIVE",
                "CustComment": CustComment,
                "EventId": EventId
            }
        });
    }

    async function DeleteAppt(agent) {
        var ApptDB = await GetDBData(EntryDBPath);
        const CustName = agent.parameters.CustName;
        const CustMobile = agent.parameters.CustMobile;

        var ApptExist = false;
        ApptDB.forEach(element => {
            if ((CustName.toLowerCase() == element.CustName.toLowerCase()) && (CustMobile == element.CustMobile) && element.Status == 'ACTIVE') {
                agent.add(`Yes, you have an existing appointment on ${element.ApptDate} at ${element.ApptTime}. ` +
                    `Please 'Confirm Delete' if you want to proceed with the cancellation`);
                ApptExist = true;
                agent.context.set({
                    'name': 'DeleteDetails',
                    'lifespan': 2,
                    'parameters': {
                        'CustName': CustName,
                        'CustMobile': CustMobile,
                        'CustEmail': element.CustEmail,
                        'ApptDate': element.ApptDate,
                        'ApptTime': element.ApptTime,
                        'EventId': element.EventId
                    }
                });
            }
        });
        if (!ApptExist) {
            agent.add(`I am sorry but I couldn't find any appointments registered to ${CustName} and ${CustMobile}. ` +
                `You can try again to delete appointment, go start or end call`);
        }
    }

    function ConfirmDelete(agent) {
        const CustName = agent.parameters.CustName;
        const CustEmail = agent.parameters.CustEmail;
        const CustMobile = agent.parameters.CustMobile;
        const ApptDateFormat = agent.parameters.ApptDate;
        const ApptTimeFormat = agent.parameters.ApptTime;
        const EventId = agent.parameters.EventId;

        // Confirm Delete Routine Part 1: Update ACTIVE Status to DELETED at EntryDB Google Sheet 
        const DeletionPath = EntryDBPath + `/CustMobile/${CustMobile}`;
        axios.put(DeletionPath, {
            "data": {
                "Status": "DELETED",
                "TimeStampD": new Date()
            }
        }).then(res => {
            console.log('Log from Update Delete Status Function ' + res.data);
        }).catch(err => { console.log(err); });
        // End of Part 1

        // Confirm Delete Routine Part 2: Send Delete Confirmation Emails to Customer and Consultant
        // Email Notification to Customer    
        const EmailSubject1 = 'Appointment Deleted Confirmation from Maya Properties Bot';
        const EmailBody1 = 'Dear ' + CustName +
            '<p> Thank you for using Maya Properties.' +
            '<p> The appointment below is DELETED：' +
            '<p><strong> Customer Name: </strong>' + CustName +
            '<br><strong> Appointment Date & Time: </strong>' + ApptDateFormat + ' ' + ApptTimeFormat +
            '<br><strong> Consultant Name: </strong>' + AgentName +
            '<p> We hope to hear from you again soon!' +
            '<p> Have a nice day!' +
            '<p> From: Maya Properties Bot';

        // Email Notification to Consultant  
        const EmailSubject2 = 'Appointment Deleted Confirmation from Maya Properties Bot';
        const EmailBody2 = 'Dear ' + AgentName +
            '<p> There is a appointment deleted notification from Maya Properties Bot.' +
            '<p> The appointment below is DELETED：' +
            '<p><strong> Customer Name: </strong>' + CustName +
            '<br><strong> Customer Mobile: </strong>' + CustMobile +
            '<br><strong> Customer Email: </strong>' + CustEmail +
            '<br><strong> Consultant Name: </strong>' + AgentName +
            '<br><strong> Appointment Date & Time: </strong>' + ApptDateFormat + ' ' + ApptTimeFormat +
            '<p> There is no need to contact the customer.' +
            '<p> Have a nice day!' +
            '<p> From: Maya Properties Bot';

        sendEmail(CustEmail, EmailSubject1, EmailBody1);
        sendEmail(AgentEmail, EmailSubject2, EmailBody2);
        // End of Part 2

        // Confirm Delete Routine Part 3: Delete Google Calendar Event
        deleteCalendarEvent(CalendarId, EventId);
        // End of Part 3
        agent.add(`The appointment has been successfully deleted. ` +
            `You can go start or simply end call`);
    }

    function deleteCalendarEvent(CalendarId, EventId) {
        return new Promise((resolve, reject) => {
            calendar.events.delete({
                auth: serviceAccountAuth,
                calendarId: CalendarId,
                eventId: EventId
            }, (err, event) => {
                if (err) { reject(err); }
                else { resolve(event); }
            });
        });
    }

    function LeaveComment(agent) {
        const CustComment = agent.parameters.CustComment;
        const CalendarId = agent.parameters.CalendarId;
        const EventId = agent.parameters.EventId;

        // Insert Customer Comment to EntryDB Google Sheet Database 
        const UpdatePath = EntryDBPath + `/EventId/${EventId}`;
        axios.put(UpdatePath, {
            "data": {
                "CustComment": CustComment
            }
        }).then(res => {
            console.log('Log from Leave Comment Update EntryDB ' + res.data);
        }).catch(err => { console.log(err); });

        // Insert Customer Comment to Google Calendar Appointment
        const CustCommentM = 'Comment from Customer: ' + CustComment;
        return UpdateCalendar(CalendarId, EventId, CustCommentM).then((response) => {
            console.log('Update Calendar function success ', response);
            agent.add(`Your comment has been passed to the Consultant. ` +
                `You can go start or end call`);
        }).catch((err) => {
            console.log('Error in Update Calendar ', err);
            agent.add(`It seems that something is wrong.`);
        });
    }

    function UpdateCalendar(CalendarId, EventId, CustComment) {
        return new Promise((resolve, reject) => {
            calendar.events.patch({
                auth: serviceAccountAuth,
                calendarId: CalendarId,
                eventId: EventId,
                resource: {
                    description: CustComment
                }
            }, (err, event) => {
                if (err) { reject(err); }
                else { resolve(event); }
            });
        });
    }

    async function CheckSchedule(agent) {
        const ApptDate = new Date(agent.parameters.ApptDate.split('T')[0] + 'T' + '10:00:00+08:00');
        const ApptDateFormat = ApptDate.toLocaleString(
            'en-GB',
            { weekday: 'long', day: 'numeric', month: 'long', year: "numeric" }
        );

        const counter = [0, 1, 2, 3, 4, 5];
        var PromiseArray = counter.map(item =>
            CheckSlot(new Date(new Date(ApptDate).setHours(ApptDate.getHours() + (item * 2))))
        );
        const values = await Promise.all(PromiseArray);
        var OutputString = '';
        var AllNo = true;
        const TimeValues = ['10 am', '12 noon', '2 pm', '4 pm', '6 pm', '8 pm'];
        for (let i = 0; i < 6; i++) {
            if (values[i] == 'Yes') {
                OutputString = OutputString + ' ' + TimeValues[i] + ',';
                AllNo = false;
            }
        }
        if (AllNo) {
            agent.add(`I am so sorry but there are no slots available on ${ApptDateFormat}. You may want to check another day`);
        } else {
            OutputString = OutputString.slice(0, -1);
            if (OutputString.includes(',')) {
                OutputString = OutputString.substring(0, OutputString.lastIndexOf(',')) + ' and ' + OutputString.substring(OutputString.lastIndexOf(',') + 1);
            }
            agent.add(`The available slots for ${ApptDateFormat} are: ${OutputString}. You can make appointment with the Consultant`);

        }
    }

    function CheckSlot(dateTimeStart) {
        const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 2));
        return new Promise((resolve, reject) => {
            calendar.events.list({
                auth: serviceAccountAuth, // List events for time period
                calendarId: CalendarId,
                timeMin: dateTimeStart.toISOString(),
                timeMax: dateTimeEnd.toISOString()
            }, (err, calendarResponse) => {
                if (calendarResponse.data.items.length == 0) { resolve('Yes'); }
                if (calendarResponse.data.items.length > 0) { resolve('No'); }
                if (err) { reject('error'); }
            }
            );
        });
    }

    let intentMap = new Map();
    intentMap.set('MakeAppt', MakeAppt);
    intentMap.set('LeaveComment', LeaveComment);
    intentMap.set('FailureAppt', MakeAppt);
    intentMap.set('HomeValue', HomeValue);
    intentMap.set('CheckSchedule', CheckSchedule);
    intentMap.set('DeleteAppt', DeleteAppt);
    intentMap.set('ConfirmDelete', ConfirmDelete);
    agent.handleRequest(intentMap);
});