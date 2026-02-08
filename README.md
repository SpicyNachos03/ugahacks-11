## Inspiration
AI is growing at a rapid rate. Sometimes, it feels as if we as humans can't even keep up with a new model or two dropping every day. How about the AI Data Centers that are trying to keep up? Substantial amount of energy is being consumed to run new top of the line water cooling AI Data Centers, harming the immediate area. We want to disperse and offload as much energy as possible to reduce the waste of energy that is created when we continue to utilize AI. Supa Idle wants to optimize our energy consumption, one idle device at a time.

## What it does
Our project uses two niche computer science paradigms, federated learning and edge-cloud synergy as a method to offload AI data center loads to idle devices. Although these devices may be small in power compared to chips in data centers, they are using up power everyday when they are not being actively used, so we thought to put them to work. We simulate our idea into practice by estimating the number of devices within an area that can be allocated for computational offload, which our dashboard shows the potential energy we have just waiting. From using these devices, our insights show that our idea can save the data centers from things, such as the cost of cooling, and lessen their environmental impact onto the world.

## How we built it
The frontend was designed with Figma, which was then turned into code and placed within React.js, incorporating various inputs through Open StreetMap API, WorldPop API, WeatherAPI in order to feed it to our models in the backend.

The backend was build with Flask and our models were built and trained with Jupyter Notebook (would have used DigitalOcean, but we did not get the credits!), going through two steps of calculations and receiving inputs from the frontend each step of the way.

Our insights were then built through Gemini-API, which we used to use their ability to examine external factors, our outputs, and other relevant data to give a comprehensive analysis of the impact of federated learning and edge-cloud synergy in our real world today.

## Challenges we ran into
In creating the model within the backend, we had a lot of challenges trying to calculate each metric and creating the appropriate logic to deliver the outputs we desired. Additionally, we had to make a lot of assumptions as data of this type is not widely available.

In the frontend, connectivity of the data from the backend required a lot of troubleshooting. Additionally, we were working heavily with sensitive APIs. We also ran into issues as some of us kept running out of storage throughout this project.

## Accomplishments that we're proud of
We are proud about building a ground-up model with real world data or simulated real world data. We are also proud that we are addressing an ongoing problem with a unique standpoint and bringing more light to this relatively new technique to offset workloads from data centers.

## What we learned
We learned more about data centers and how the ongoing issues they face. Some of us have not learned about these paradigms before then, and none of us knew about how impactful these techniques could have on our world if used in a large-scale. We upgraded our UI/UX using Figma, something relatively new to us.

##What's next for Supa Idle
Given real data and more of it, we will be able to be more accurate in our models and calculations of how much energy we can save and its impact towards the community around data centers today. We hope to see the implementation of this project and put into real-world practice.
