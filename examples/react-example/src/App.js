import React, { Component } from 'react';
import './App.css';
import Client from 'fhir-kit-client';

class App extends Component {

  state = {
    patientData: null
  }

  //const patient = await fhirClient.read({ resourceType: 'Patient', id: token.patient });
  async componentDidMount() {
    
    const baseUrl = "https://r4.smarthealthit.org";
    const patientId = "62acbbe9-7bae-4d33-b53f-a389c1a0e281";
    const client = new Client({ baseUrl });
    
    const response = await client.read({ resourceType: 'Patient', id: patientId });
  
    // const stringified = JSON.stringify(data);
    this.setState({ patientData: response });
  }

  render() {
    console.log(this.state.patientData);
    return (
      <div className="App">
        <header className="App-header">
          <p>Below, the app fetches a patient's data on <code>componentDidMount()</code></p>
          {
            this.state.patientData ?
            <div>{ JSON.stringify(this.state.patientData) }</div> :
            <div>No patient data</div>
          }
        </header>
      </div>
    );
  }
}
  

export default App;
