// *********************************************************************************************************************
// HTMLElements
// *********************************************************************************************************************
const incPulseBtn = document.getElementById("inc-pulse")
const decPulseBtn = document.getElementById("dec-pulse")
const incCounterpulseBtn = document.getElementById("inc-conterpulse")
const decCounterpulseBtn = document.getElementById("dec-conterpulse")
const playBtn = document.getElementById("play")
const labelElm = document.getElementById('label')
const gridElm = document.getElementById('grid')
const tempoLabelElm = document.getElementById('tempo-label')
const tempoSliderElm = document.getElementById('tempo-slider')
const radioNoteElms = document.getElementsByName('radio-notes')
const groupSubdivisionsElm = document.getElementById('groupSubdivisions')
const countOffElm = document.getElementById('countOff')

// *********************************************************************************************************************
// Constants
// *********************************************************************************************************************
const NOTE_LENGTH = 0.05 // beep length in seconds
const SCHEDULE_AHEAD_TIME = 0.25

const NOTE_OPTION_PULSE = 'PULSE'
const NOTE_OPTION_ALL = 'ALL'
const NOTE_OPTIONS = [NOTE_OPTION_PULSE, NOTE_OPTION_ALL]

// *********************************************************************************************************************
// State
// *********************************************************************************************************************
const state = {
  pulse: 11,
  counterpulse: 7,
  bpm: 70,

  noteToBeScheduled: null, // next note to be scheduled, number in range [0, x*y)
  nextNoteTime: null, // time when next note is to be played
  scheduledNotes: [], // {note: number in range [0, x*y), time: number, animated: bool}
  currentNote: 0, // number in range [0, x*y)
  countOffNotes: 0, // number of count-off notes still to be played (disables animation of notes)

  audioContext: null,
  intervalID: null, // intervalID of setTimeout which schedules notes

  // Settings
  noteOption: NOTE_OPTION_ALL,
  groupSubdivisions: true,
  countOff: true,
}

const changeSignature = (key, val) => () => {
  state[key] += val
  renderLabel()
  renderGrid()
  renderSignatureControls()
  renderTempo()
}

// *********************************************************************************************************************
// Shim requestAnimationFrame
// *********************************************************************************************************************

window.requestAnimFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();


// *********************************************************************************************************************
// Grid
// *********************************************************************************************************************
const renderGrid = () => {

  gridElm.style.gridTemplateRows = `repeat(${state.pulse}, minmax(5px, min(50px, calc((100vh - 110px - (5px * ${state.pulse})) / ${state.pulse})))`
  gridElm.style.gridTemplateColumns = `repeat(${state.counterpulse}, minmax(5px, 50px))`

  gridElm.textContent = ''

  for (let i = 0; i < state.pulse * state.counterpulse; i++) {
    const cell = document.createElement("div")
    cell.classList.add('cell');
    if (i % state.counterpulse === 0) {
      cell.classList.add('cell--primary')
    }
    if (i % state.pulse === 0) {
      cell.classList.add('cell--secondary')
    }

    if (state.groupSubdivisions) {
      const isIntermediate = (i % state.counterpulse) % 2 === 1
      cell.textContent = isIntermediate ? '&' : `${(i % state.counterpulse) / 2 + 1}`
      if (isIntermediate) cell.classList.add('cell--intermediate')
    } else {
      cell.textContent = `${i % state.counterpulse + 1}`
    }


    gridElm.appendChild(cell)
  }
}

const highlightCell = () => {
  gridElm.childNodes.forEach(
    (n, i) => i === state.currentNote ?
      n.classList.add("cell--active") :
      n.classList.remove("cell--active")
  )
}

const animateCells = () => {
  if (!isRunning()) {
    return
  }

  const currentTime = state.audioContext.currentTime
  let highlight = false

  while (state.scheduledNotes.length && state.scheduledNotes[0].time < currentTime) {
    state.currentNote = state.scheduledNotes[0].note
    highlight = state.scheduledNotes[0].animated
    state.scheduledNotes.shift()
  }

  highlight && highlightCell()

  window.requestAnimFrame(animateCells)
}

// *********************************************************************************************************************
// Header
// *********************************************************************************************************************
const renderLabel = () => {
  labelElm.textContent = `${state.pulse} versus ${state.counterpulse}`
}

const renderSignatureControls = () => {
  incPulseBtn.disabled = state.pulse >= 11
  incCounterpulseBtn.disabled = state.counterpulse >= 11
  decPulseBtn.disabled = state.pulse <= 2
  decCounterpulseBtn.disabled = state.counterpulse <= 2
}

// *********************************************************************************************************************
// Audio
// *********************************************************************************************************************
const scheduleIntermediateNote = (countOff) => {
  if (state.groupSubdivisions && (state.noteToBeScheduled % state.counterpulse) % 2 === 1) {
    return
  }
  if ((state.noteToBeScheduled % state.pulse !== 0 || countOff) && state.noteToBeScheduled % state.counterpulse !== 0) {
    const osc = state.audioContext.createOscillator();
    osc.connect(state.audioContext.destination);
    osc.frequency.value = 220.0

    osc.start(state.nextNoteTime)
    osc.stop(state.nextNoteTime + NOTE_LENGTH / 2)
  }
}

const scheduleNotes = () => {
  while (state.nextNoteTime < state.audioContext.currentTime + SCHEDULE_AHEAD_TIME) {

    const newNote = {note: state.noteToBeScheduled, time: state.nextNoteTime, animated: true}
    let countOff = false

    if (state.countOffNotes > 0) {
      countOff = true
      newNote.animated = false
      state.countOffNotes--
    }

    if (state.noteToBeScheduled % state.pulse === 0 && !countOff) {
      const osc = state.audioContext.createOscillator();
      osc.connect(state.audioContext.destination);
      osc.frequency.value = 880.0

      osc.start(state.nextNoteTime)
      osc.stop(state.nextNoteTime + NOTE_LENGTH)
    }
    if (state.noteToBeScheduled % state.counterpulse === 0) {
      const osc = state.audioContext.createOscillator();
      osc.connect(state.audioContext.destination);
      osc.frequency.value = 440.0

      osc.start(state.nextNoteTime)
      osc.stop(state.nextNoteTime + NOTE_LENGTH)
    }
    if (state.noteOption === NOTE_OPTION_ALL) {
      scheduleIntermediateNote(countOff)
    }

    state.scheduledNotes.push(newNote)

    const secondsPerBeat = 60.0 / state.bpm / state.counterpulse
    state.nextNoteTime += secondsPerBeat

    state.noteToBeScheduled = (state.noteToBeScheduled + 1) % (state.pulse * state.counterpulse)
  }
}

// *********************************************************************************************************************
// Controls
// *********************************************************************************************************************
const isRunning = () => !!state.intervalID
const unlockAudio = () => {
  const buffer = state.audioContext.createBuffer(1, 1, 22050);
  const node = state.audioContext.createBufferSource();
  node.buffer = buffer;
  node.start(0);
}

const start = () => {
  if (!isRunning()) {
    if (!state.audioContext) {
      state.audioContext = new AudioContext()

      // TODO: do we need this?
      unlockAudio()
    }

    state.nextNoteTime = state.audioContext.currentTime + SCHEDULE_AHEAD_TIME
    state.noteToBeScheduled = 0
    state.scheduledNotes = []
    state.currentNote = 0

    if (state.countOff) {
      // use `-4` because we want to count 4 measures
      state.noteToBeScheduled = pmod(-4 * state.counterpulse, state.pulse * state.counterpulse)
      state.currentNote = pmod(-4 * state.counterpulse, state.pulse * state.counterpulse)
      state.countOffNotes = 4 * state.counterpulse
    }

    state.intervalID = setInterval(() => {
      scheduleNotes()
    }, 100)
    window.requestAnimFrame(animateCells)
    renderPlayBtn()
  } else {
    clearInterval(state.intervalID)
    state.intervalID = null

    state.currentNote = null
    state.scheduledNotes = []

    highlightCell()
    renderPlayBtn()
  }
}

const renderTempo = () => {
  tempoLabelElm.textContent = `Tempo: ${state.bpm}`
}

const renderPlayBtn = () => {
  playBtn.innerHTML = isRunning() ? '<span>&#x25FC;</span>' : '<span>&#x25B6;</span>'
}

// *********************************************************************************************************************
// Initialization
// *********************************************************************************************************************
const init = () => {
  incPulseBtn.addEventListener('click', () => {
    changeSignature('pulse', 1)();
    stop()
  })
  decPulseBtn.addEventListener('click', () => {
    changeSignature('pulse', -1)();
    stop()
  })
  incCounterpulseBtn.addEventListener('click', () => {
    changeSignature('counterpulse', 1)();
    stop()
  })
  decCounterpulseBtn.addEventListener('click', () => {
    changeSignature('counterpulse', -1)();
    stop()
  })

  playBtn.addEventListener('click', start)

  tempoSliderElm.addEventListener('input', () => {
    state.bpm = tempoSliderElm.value
    renderTempo()
  })

  for (let i = 0; i < radioNoteElms.length; i++) {
    radioNoteElms[i].addEventListener('click', () => {
      state.noteOption = NOTE_OPTIONS[i]
      renderGrid()
    })
  }

  groupSubdivisionsElm.addEventListener('click', () => {
    state.groupSubdivisions = groupSubdivisionsElm.checked
    renderGrid()
  })

  countOffElm.addEventListener('click', () => {
    state.countOff = countOffElm.checked
  })

  renderLabel()
  renderGrid()
  renderTempo()
}
init()

// *********************************************************************************************************************
// Utility
// *********************************************************************************************************************
const pmod = (a, m) => ((a % m) + m) % m