function setLoggedIn(loggedInBoolean) {
  let body = document.body;
  body.dataset.loggedIn = !!loggedInBoolean;
}




function createExistingVote(voter, vote) {
  let voteDiv = document.createElement('div');
  voteDiv.innerHTML = "";
  if (vote === "yes") {
    voteDiv.classList.add('vote-yes');
  } else if (vote === "no") {
    voteDiv.classList.add('vote-no');
  }
  voteDiv.innerText = voter;
  return voteDiv;
}

function createOneDayCard(dayData, currentSession, weather) {
  let date = new Date(dayData.date + 'T00:00:00');
  let card = document.createElement('div');
  card.innerHTML = `
      <div class="cardtop">
        <div class="date">
          <div class="dow">${date.toLocaleString("en-CA", { weekday: 'long' })}</div>
          <div class="dom">${date.toLocaleString("en-CA", { month: 'short', day: 'numeric' })}</div>
        </div>
        <div class="weather">
          <div class="temp">
            ?
          </div>
          <div class="weath">
            <img>
          </div>
        </div>
      </div>
      <div class="make-vote">
        <div class="satis-tier forloggedin">
          Can you attend?
          <div class="">
            <button class="vote yes" data-vote="yes">
              Yes ✔️
            </button>
            <button class="vote maybe" data-vote="">
              ??
            </button>
            <button class="vote no" data-vote="no">
              No ❌
            </button>
          </div>
        </div>
      </div>
      <div class="existing-votes">
      </div>
    `
  card.classList.add("card")
  card.dataset.date = dayData.date;

  if (weather) {
    // you need to figure this part out yourself
  }

  let existingVotesDiv = card.querySelector('.existing-votes');
  for (let [voter, vote] of Object.entries(dayData.votes)) {
    existingVotesDiv.append(createExistingVote(voter, vote))
  }

  return card;
}



function updateVotableDays(daysWithVotes, currentSession, weatherForecasts) {
  let daysView = document.querySelector(".days-view");
  if (!daysView) {
    console.error("could not find element to put days into")
    return;
  }

  daysView.innerHTML = '';
  for (let date in daysWithVotes) {
    let votes = daysWithVotes[date];
    let weather = weatherForecasts?.[date];
    daysView.append(createOneDayCard({ date, votes }, currentSession, weather))
  }
}












class FrontendState {

  constructor() {
    this.currentSession = undefined;
    this.daysWithVotes = [];
    this.weatherForecasts = {};
  }

  async refreshAllState(updateView = true) {
    await Promise.all([
      this.refreshVotesState(false),
      this.refreshWeatherState(false),
      this.refreshSessionState(false),
    ])
    if (updateView) {
      this.updateView();
    }
  }

  async refreshVotesState(updateView = true) {
    let { success, data, error } = await getVotesFromBackend()
    if (success) {
      this.daysWithVotes = data;
    } else {
      // ha ha I'm being lazy.  can you do better?
      alert(error)
    }
    if (updateView) {
      this.updateView();
    }
  }

  async refreshWeatherState(updateView = true) {
    let { success, data, error } = await getWeather()
    if (success) {
      this.weatherForecasts = data;
    } else {
      // ha ha I'm being lazy.  can you do better?
      alert(error)
    }
    if (updateView) {
      this.updateView();
    }
  }

  async refreshSessionState(updateView = true) {
    let { success, data, error } = await getSessionFromBackend()
    if (success) {
      this.currentSession = data;
    } else {
      // ha ha I'm being lazy.  can you do better?
      alert(error)
    }
    if (updateView) {
      this.updateView();
    }
  }

  async updateView() {
    // 1. update the whole frontend so that it shows relevant logged-in vs logged-out features
    setLoggedIn(!!this.currentSession)

    // 2. optionally update the header so that it shows the username of the person logged in
    // updateHeader(this.currentSession)

    // 3. render the days
    updateVotableDays(this.daysWithVotes, this.currentSession, this.weatherForecasts)
  }
}




const fes = new FrontendState();
fes.refreshAllState()







async function handleAuthEvent(event) {
  event.preventDefault();
  // console.log(event.currentTarget, event.target)
  let usernameInput = event.currentTarget.querySelector('#headerusername');
  let usernameValue = usernameInput.value;
  let passwordInput = event.currentTarget.querySelector('#headerpassword');
  let passwordValue = passwordInput.value;
  let button = event.target.closest('button');
  if (button) {
    let authActionName = button?.dataset?.authAction;
    let authActionFunction = {
      signup: ajaxSignup,
      login: ajaxLogin,
      logout: ajaxLogout,
    }[authActionName];
    if (authActionFunction) {
      let authResult = await authActionFunction(usernameValue, passwordValue);
      if (authResult && authResult.success) {
        await fes.refreshSessionState();
        usernameInput.value = passwordInput.value = '';
      } else if (authResult) {
        // yo this is crap and if you want to be better than me, replace it.
        alert(authResult.error)
      } else {
        // yo this is crap and if you want to be better than me, replace it.
        alert("unknown network error")
      }
    }
  }
}

const authform = document.querySelector('form.authform')
authform.addEventListener("click", handleAuthEvent);





async function handleVoteEvent(event) {
  event.preventDefault();
  let button = event.target.closest('button.vote');
  // console.log(button)

  if (button) {
    let voteVal;
    if (button.classList.contains('yes')) { voteVal = 'yes'; }
    if (button.classList.contains('no')) { voteVal = 'no'; }
    if (button.classList.contains('maybe')) { voteVal = 'maybe'; }
    let cardDiv = button.closest("div.card");
    if (!voteVal || !cardDiv) {
      // console.log({ voteVal, cardDiv })
      return;
    }
    let cardDate = cardDiv.dataset.date
    let voteActionResult = await setMyVote(cardDate, voteVal)

    if (voteActionResult) {
      await fes.refreshVotesState();
    }

  }
}

const daysViewDiv = document.querySelector('section.days-view');
daysViewDiv.addEventListener("click", handleVoteEvent);