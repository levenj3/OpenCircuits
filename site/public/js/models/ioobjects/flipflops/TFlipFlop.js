class TFlipFlop extends Gate {
    constructor(context, x, y) {
        super(context, false, x, y, undefined);
        this.noChange = true;
        this.setInputAmount(2);
        this.setOutputAmount(2);
        this.transform.setSize(this.transform.size.scale(1.5));
		this.clock = false;
		this.last_clock = false;
		this.state = false;
    }
    onTransformChange() {
        this.transform.setSize(V(DEFAULT_SIZE, DEFAULT_SIZE));
        super.onTransformChange();
        this.transform.setSize(V(DEFAULT_SIZE*1.5, DEFAULT_SIZE*1.5));
    }
    activate(x) {
		this.last_clock = this.clock;
        this.clock = this.inputs[0].isOn;
        var toggle = this.inputs[1].isOn;
        if (this.clock && !this.last_clock && toggle) {
            this.state = !this.state;
        }

        super.activate(this.state, 0);
        super.activate(!this.state, 1);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();
        this.localSpace();
        renderer.rect(0, 0, this.transform.size.x, this.transform.size.y, this.getCol(), this.getBorderColor());
        renderer.restore();
    }
    getDisplayName() {
        return "T Flip Flop";
    }
}
TFlipFlop.getXMLName = function() { return "srff"; }
Importer.types.push(TFlipFlop);
