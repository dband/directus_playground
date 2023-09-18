import { defineEndpoint } from '@directus/extensions-sdk';
import Handlebars from "handlebars";

export default defineEndpoint((router, { services, database, getSchema, logger }) => {
	const { ItemsService } = services;

    function getView() {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>My Event Ticketing System</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
            </head>
            <body>
                <div class="m-5">
                    <p class="title is-2">Event attendees</p>
                    <div class="block">
                        <div id="requestdenied" class="block"></div>
                        <div id="participations" class="block">
                            {{#if attendees}}
                                {{#each myEvents}}
                                <p>{{name}} attends event {{event.name}}</p>
                                {{/each}}
                            {{else}}
                                <p id="noreservations">No event has been booked yet</p>
                            {{/if}}
                        </div>
                    </div>
                    <p class="title is-2">Other upcoming events</p>
                    <div class="columns is-flex">
                        <div class="column">
                            {{#each events}}
                            <div class="ml-2 mb-5" style="max-width: 45em;">
                                <div class="block columns is-flex is-justify-content-space-between" style="font; border-bottom: 1px black solid">
                                    <div class="column">
                                        <p class="title is-3">{{name}}</p>
                                    </div>
                                    <div class="column is-flex is-justify-content-flex-end">
                                        <button class="button is-link" onclick="showFormFor('{{name}}', '{{id}}');">Reserve seat</button>
                                    </div>
                                </div>
                                <div class="content">
                                    Date: {{event_date}}
                                </div>
                                <div class="content">
                                    {{description}}
                                </div>
                            </div>
                            {{/each}}
                        </div>
                        <div class="column ml-2" id="form1" style="display: none;">
                            <p class="title is-3" id="formregistrationtitle"></h3>
                            <form id="requestform">
                                <div class="field">
                                    <label class="label">Name</label>
                                    <div class="control">
                                        <input name="name" class="input" type="text" placeholder="">
                                    </div>
                                </div>
                                <div class="field">
                                    <label class="label">E-Mail</label>
                                    <div class="control">
                                        <input name="email" class="input" type="email" placeholder="my@email.com">
                                    </div>
                                </div>
                                <div class="field">
                                    <label class="label">Phone</label>
                                    <div class="control">
                                        <input name="phone" class="input" type="tel" placeholder="+49 1578 1234567">
                                    </div>
                                </div>
                                <div class="field is-grouped">
                                    <div class="control">
                                        <button class="button is-link" type="button" onclick="submitForm()">Submit</button>
                                    </div>
                                    <div class="control">
                                        <button class="button is-link is-light" type="button" onclick="closeReservationForm()">Cancel</button>
                                    </div>
                                </div>
                                <input id="formeventid" type="hidden" name="event" value="">
                            </form>
                        </div>
                    </div>
                </div>
                <script>
                    const connection = new WebSocket('wss://localhost/websocket');

                    connection.addEventListener('open', function () {
                        console.log({ event: 'onopen' });
                        subscribe();
                    });
                    
                    connection.addEventListener('message', function (message) {
                        console.log({ event: 'onmessage', message });
                        
                        const data = JSON.parse(message.data);
                        if (data.event == 'update') {
                            handleUpdateEvent(data.data);
                        }
                        else if ((data.event == 'create' || data.event == 'init') && data.data ) {
                            handleCreateEvent(data.data);
                        }
                    });
                    
                    connection.addEventListener('close', function () {
                        console.log({ event: 'onclose' });
                    });
                    
                    connection.addEventListener('error', function (error) {
                        console.log({ event: 'onerror', error });
                    });

                    function handleCreateEvent(data) {
                        if (data.length == 0) {
                            return;
                        }

                        let participations = '';

                        const template = '<p>{name} attends event {event}</p>';
                        for (const participant of data) {
                            participations += template
                                .replace('{name}', participant.name)
                                .replace('{event}', participant.event.name);
                        }

                        const noReservationsEl = document.getElementById('noreservations');

                        const participationsEl = document.getElementById('participations');

                        if (noReservationsEl === null) {
                            participationsEl.innerHTML += participations;
                        } else {
                            participationsEl.innerHTML = participations;  
                        }
                    }

                    function handleUpdateEvent(data) {
                        const err = '<article class="message is-danger">'
                            + '<div class="message-header">'
                            +    '<p>Your reservation for {event} could not be processed</p>'
                            +    '<button class="delete" aria-label="delete" onclick="dismissErr(this)"></button>'
                            + '</div>'
                            + '</article>'

                        let errMessages = '';

                        const denied = data.filter(request => request.status == 'denied');
                        for (const d of denied) {
                            errMessages += err.replace('{event}', d.event.name);
                        }

                        const deniedSection = document.getElementById('requestdenied');
                        deniedSection.innerHTML = errMessages;
                    }

                    function dismissErr(buttonElement) {
                        // Get the parent article element and remove it from the DOM
                        const articleElement = buttonElement.closest('.message');
                        
                        if (articleElement) {
                            articleElement.remove();
                        }
                    }

                    function showFormFor(event, eventid) {
                        const selectedForm = document.getElementById('form1');
                        selectedForm.style.display = 'block';     
                        
                        const formTitle = document.getElementById('formregistrationtitle');
                        formTitle.textContent = 'Reservation: ' + event;

                        const formEventName = document.getElementById('formeventid');
                        formEventName.value = eventid;
                    }

                    function submitForm(form) {
                        const formData = new FormData(document.getElementById('requestform'));

                        connection.send(
                            JSON.stringify({
                                type: 'items',
                                action: 'create',
                                collection: 'reservation_requests',
                                data: Object.fromEntries(formData.entries())
                            })
                        );
                    }

                    function closeReservationForm() {
                        const selectedForm = document.getElementById('form1');
                        selectedForm.style.display = 'none';
                        
                        const formTitle = document.getElementById('formregistrationtitle');
                        formTitle.textContent = '';
                    }

                    function subscribe() {
                        connection.send(
                            JSON.stringify({
                                type: 'subscribe',
                                event: 'update',
                                collection: 'reservation_requests',
                                query: { fields: ['id', 'status', 'event.name'], query: {status: {_in: ['success', 'denied']}} },
                            })
                        );

                        connection.send(
                            JSON.stringify({
                                type: 'subscribe',
                                collection: 'participants',
                                query: { fields: ['*.*'] },
                            })
                        ); 
                    }
                </script>
            </body>
        </html>
        `;
    }

	router.get('/', async (_req, res) => {
		const schema = await getSchema({ database });

        const eventService = new ItemsService('events', { schema: schema });

        const events = await eventService.readByQuery({filter: {event_date: {_gt: new Date().toISOString()}}});

        const template = Handlebars.compile(getView());

        res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost");
        res.send(template({events: events, myEvents: []}));
	});
});
