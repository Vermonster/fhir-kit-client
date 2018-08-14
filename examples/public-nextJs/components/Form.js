// import Link from 'next/link';
import React, {Component} from 'react';

class Form extends Component {
    constructor(props){
        super(props);
        this.state = [];
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleSubmit = (e) => {
        e.preventDefault();
        //submit should send to auth server
    }

    //include logic here for auth? separate out functions

    render() {
        return(
            <form>
                <label>Username:
                    <input type='text'/>
                </label>
                <label>Password:
                    <input type='text'/>
                </label>
                    <input type='submit' value='Submit' onSubmit={this.handleSubmit}></input>
            </form>
        )
    }
};

export default Form;