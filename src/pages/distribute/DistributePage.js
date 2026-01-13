import React from "react";

var config = {
    successURL : "https://ticketing.tilda.ws/thank-you-page",
    errorURL : "https://ticketing.tilda.ws/fail"
}

class DistributePage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            status: this.props.searchParams.get("status"),
            b_id: this.props.searchParams.get("b_id")
        }
        if (this.state.status === "succeeded") {
            window.location.href = config.successURL
        }
        else {
            window.location.href = config.errorURL
        }

    }
    render() {

        return (
            <></>
        )

    }
}
export default DistributePage